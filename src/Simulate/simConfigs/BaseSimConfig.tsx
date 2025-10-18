import { useEffect, useState, useCallback, useMemo, useRef } from "react";
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

  const buildInitialFormData = useCallback(() => {
    const initialFormData = { ...getInitialFormData(initialData) } as F;

    if ("source" in initialFormData && initialFormData.source && netlist) {
      const isValidSource = validateSourceInNetlist(
        netlist,
        initialFormData.source as string
      );
      if (!isValidSource) {
        const defaultSource = getDefaultSource(netlist);
        (initialFormData as Record<string, string>).source = defaultSource;
      }
    }

    return initialFormData;
  }, [getInitialFormData, initialData, netlist]);

  const [formData, setFormData] = useState<F>(() => buildInitialFormData());
  const publishTimeoutRef = useRef<number | null>(null);
  const lastPublishedFormRef = useRef<string | undefined>(undefined);
  const lastConfigStringRef = useRef<string | undefined>(undefined);
  const lastFullConfigSerializedRef = useRef<string | undefined>(undefined);

  const nameFromInitialData = useMemo(
    () => (initialData && "name" in initialData ? initialData.name : undefined),
    [initialData]
  );

  const handleInputChange = useCallback(
    (field: string, value: string | boolean | number) => {
      setFormData((prev) => {
        const currentValue = prev[field as keyof F] as unknown;
        if (currentValue === value) {
          return prev;
        }
        return {
          ...prev,
          [field]: value,
        } as F;
      });
    },
    []
  );

  useEffect(() => {
    // This effect pushes changes to the parent after each keystroke while deduping
    // the payload. It prevents the recursive update loop we hit previously when
    // the Simulate tab regenerated the netlist on every character (including backspace).
    const serializedForm = JSON.stringify(formData);
    if (lastPublishedFormRef.current === serializedForm) {
      return;
    }

    if (publishTimeoutRef.current !== null) {
      window.clearTimeout(publishTimeoutRef.current);
    }

    publishTimeoutRef.current = window.setTimeout(() => {
      lastPublishedFormRef.current = serializedForm;

      const configString = generateConfigString(formData);
      if (lastConfigStringRef.current !== configString) {
        lastConfigStringRef.current = configString;
        onConfigChange(configString);
      }

      if (onFullConfigChange) {
        const fullConfig = generateFullConfig(formData, nameFromInitialData);
        const serializedFullConfig = JSON.stringify(fullConfig);
        if (lastFullConfigSerializedRef.current !== serializedFullConfig) {
          lastFullConfigSerializedRef.current = serializedFullConfig;
          onFullConfigChange(fullConfig);
        }
      }
    }, 0);

    return () => {
      if (publishTimeoutRef.current !== null) {
        window.clearTimeout(publishTimeoutRef.current);
        publishTimeoutRef.current = null;
      }
    };
  }, [
    formData,
    generateConfigString,
    generateFullConfig,
    nameFromInitialData,
    onConfigChange,
    onFullConfigChange,
  ]);

  const configString = useMemo(
    () => generateConfigString(formData),
    [formData, generateConfigString]
  );

  const detectedSources = netlist ? detectSourcesFromNetlist(netlist) : [];

  return {
    formData,
    handleInputChange,
    configString,
    isValid: validateConfig(formData),
    detectedSources,
  };
}
