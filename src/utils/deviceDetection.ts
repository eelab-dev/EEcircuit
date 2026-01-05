/**
 * Detects if the current device is a mobile device (smartphone or tablet)
 * @returns true if the device is mobile, false otherwise
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;

  // Check user agent for mobile indicators
  const userAgent = navigator.userAgent.toLowerCase();
  const mobileKeywords = [
    'mobile', 'android', 'iphone', 'ipad', 'ipod', 
    'blackberry', 'windows phone', 'opera mini'
  ];
  
  const hasMobileUserAgent = mobileKeywords.some(keyword => 
    userAgent.includes(keyword)
  );
  
  // Check for touch capability
  const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  // iPadOS 13+ often requests desktop site by default (MacIntel platform + touch points)
  const isIpadDesktopMode = 
    navigator.platform === 'MacIntel' && 
    navigator.maxTouchPoints > 1;

  // Typical mobile/tablet breakpoint, but we rely less on this if other signals are strong
  const isSmallScreen = window.innerWidth <= 1024; 
  
  // A device is considered mobile if:
  // 1. It has a mobile user agent
  // 2. It is an iPad in desktop mode
  // 3. It has touch AND is a small screen (covers generic tablets/phones that might be missed by UA)
  return hasMobileUserAgent || isIpadDesktopMode || (hasTouchScreen && isSmallScreen);
}

/**
 * Gets the recommended input profile based on device type
 * @returns "touchscreen" for mobile devices, "trackpad" for desktop/laptop
 */
export function getRecommendedInputProfile(): "touchscreen" | "trackpad" {
  return isMobileDevice() ? "touchscreen" : "trackpad";
}