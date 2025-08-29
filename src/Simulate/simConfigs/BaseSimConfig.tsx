import { useEffect, useState, useCallback } from "react";
import { SimulationType } from "../../types/commonTypes";
import { detectSourcesFromNetlist, validateSourceInNetlist, getDefaultSource } from "../../utils/sourceDetection";

export interface BaseSimConfigProps<T extends SimulationType> {
  onConfigChange: (configString: string) => void;
  onFullConfigChange?: (config: T) => void;
  initialData?: T;
  netlist?: string;
}

export interface BaseSimConfigState {
  [key: string]: string | boolean | number;
}

export interface BaseSimConfigMethods<T extends SimulationType, F extends BaseSimConfigState> {
  generateConfigString: (formData: F) => string;
  generateFullConfig: (formData: F, name?: string) => T;
  validateConfig: (formData: F) => boolean;
  getInitialFormData: (initialData?: T) => F;
}

/**
 * BaseSimConfig Hook - Unified Simulation Configuration System
 * 
 * This hook provides a consistent foundation for all simulation configuration components
 * (DC, AC, Transient), eliminating focus loss issues and ensuring real-time updates.
 * 
 * ## Architecture Overview
 * 
 * The simulation system follows a 3-layer architecture:
 * 1. **Config Panel** - UI for selecting and managing simulation configurations
 * 2. **Simulation String** - Real-time SPICE command generation (e.g., ".dc V1 0 10 1")  
 * 3. **Full Netlist** - Complete netlist with embedded simulation commands
 * 
 * ## How It Works
 * 
 * 1. **Real-time Updates**: As the user types in any input field, the hook immediately:
 *    - Updates local form state
 *    - Generates new SPICE command string
 *    - Calls onConfigChange() with corrected config string
 *    - Calls onFullConfigChange() if config is valid
 * 
 * 2. **No Focus Loss**: Uses controlled inputs with onChange (not onBlur) to prevent
 *    input field focus interruption during typing
 * 
 * 3. **Consistent Validation**: All simulation types use the same validation pattern
 *    through the validateConfig method
 * 
 * ## Creating New Simulation Types
 * 
 * To add a new simulation type (e.g., "NOISE"), follow this pattern:
 * 
 * ```typescript
 * // 1. Define form data interface
 * interface NoiseFormData extends BaseSimConfigState {
 *   source: string;
 *   startFreq: string;
 *   stopFreq: string;
 * }
 * 
 * // 2. Implement configuration methods
 * const noiseConfigMethods: BaseSimConfigMethods<SimulationNoise, NoiseFormData> = {
 *   generateConfigString: (formData) => 
 *     `.noise v(out) ${formData.source} ${formData.startFreq} ${formData.stopFreq}`,
 *   
 *   generateFullConfig: (formData, name) => ({
 *     type: "Noise",
 *     name,
 *     source: formData.source,
 *     startFreq: formData.startFreq,
 *     stopFreq: formData.stopFreq,
 *   }),
 *   
 *   validateConfig: (formData) => !!(
 *     formData.source?.toString().trim() &&
 *     formData.startFreq?.toString().trim() &&
 *     formData.stopFreq?.toString().trim()
 *   ),
 *   
 *   getInitialFormData: (initialData) => ({
 *     source: initialData?.source || "",
 *     startFreq: initialData?.startFreq || "",  
 *     stopFreq: initialData?.stopFreq || "",
 *   })
 * };
 * 
 * // 3. Use the hook in your component
 * const NoiseConfig: React.FC<BaseSimConfigProps<SimulationNoise>> = (props) => {
 *   const { formData, handleInputChange, configString } = 
 *     useBaseSimConfig<SimulationNoise, NoiseFormData>(props, noiseConfigMethods);
 *   
 *   return (
 *     <Input 
 *       value={formData.source}
 *       onChange={(e) => handleInputChange("source", e.target.value)}
 *     />
 *   );
 * };
 * ```
 * 
 * ## Key Design Principles
 * 
 * - **Real-time Updates**: Configuration changes immediately update simulation string and netlist
 * - **Single Source of Truth**: Clear data flow from config UI → simulation string → netlist  
 * - **Consistent Patterns**: All config types behave identically
 * - **Simple State Management**: No complex refs, flags, or circular update prevention
 * - **No Focus Loss**: Proper controlled input handling without callback refs
 * 
 * ## Data Flow
 * 
 * ```
 * User types → handleInputChange() → formData updated → 
 * generateConfigString() → onConfigChange() → simulate.tsx → 
 * netlist updated → editor shows new netlist
 * ```
 * 
 * @param props Configuration props including callbacks and initial data
 * @param methods Object containing config-specific generation and validation methods
 * @returns Form data, input handler, config string, and validation state
 */
export function useBaseSimConfig<T extends SimulationType, F extends BaseSimConfigState>(
  props: BaseSimConfigProps<T>,
  methods: BaseSimConfigMethods<T, F>
) {
  const { onConfigChange, onFullConfigChange, initialData, netlist } = props;
  const { generateConfigString, generateFullConfig, validateConfig, getInitialFormData } = methods;

  // Initialize form data from initial data or defaults
  const [formData, setFormData] = useState<F>(() => 
    getInitialFormData(initialData)
  );

  // Handle input changes with real-time updates
  const handleInputChange = useCallback((field: string, value: string | boolean | number) => {
    setFormData(currentFormData => {
      const newFormData = { ...currentFormData, [field]: value };

      // CRITICAL: Defer callback execution to prevent React warning
      // 
      // React Rule: Cannot update parent component state while child is rendering
      // Problem: handleInputChange can be called during user interactions that happen
      //          while the component is still in its render cycle
      // Solution: setTimeout(0) pushes callbacks to next event loop tick, ensuring
      //          they execute AFTER the current render phase is complete
      // 
      // This is the correct use of setTimeout for React - not as an initialization hack,
      // but to properly defer callback execution until render is finished
      setTimeout(() => {
        const configString = generateConfigString(newFormData);
        onConfigChange(configString);

        // Send full configuration if callback provided (regardless of validation for AC parameter addition)
        if (onFullConfigChange) {
          const name = initialData && 'name' in initialData ? initialData.name : undefined;
          const fullConfig = generateFullConfig(newFormData, name);
          onFullConfigChange(fullConfig);
        }
      }, 0);

      return newFormData;
    });
  }, [generateConfigString, generateFullConfig, onConfigChange, onFullConfigChange, initialData]);

  // Update form data when initialData changes (config switching)
  useEffect(() => {
    if (initialData) {
      const newFormData = getInitialFormData(initialData);
      
      // Revalidate source if it exists and netlist is available
      if ('source' in newFormData && newFormData.source && netlist) {
        const isValidSource = validateSourceInNetlist(netlist, newFormData.source as string);
        if (!isValidSource) {
          // Reset invalid source to default or empty
          const defaultSource = getDefaultSource(netlist);
          (newFormData as Record<string, string>).source = defaultSource;
        }
      }
      
      setFormData(newFormData);
      
      // Send config string when parent changes initialData (config loading/switching)
      // No setTimeout needed here - useEffect already runs after render phase
      const configString = generateConfigString(newFormData);
      onConfigChange(configString);
    }
  }, [initialData, netlist, getInitialFormData, generateConfigString, onConfigChange]);

  // Detect sources from netlist
  const detectedSources = netlist ? detectSourcesFromNetlist(netlist) : [];

  return {
    formData,
    handleInputChange,
    configString: generateConfigString(formData),
    isValid: validateConfig(formData),
    detectedSources
  };
}