/**
 * Detects if the current device is a mobile device (smartphone or tablet)
 * @returns true if the device is mobile, false otherwise
 */
export function isMobileDevice(): boolean {
  // Check user agent for mobile indicators
  const userAgent = navigator.userAgent.toLowerCase();
  const mobileKeywords = [
    'mobile', 'android', 'iphone', 'ipad', 'ipod', 
    'blackberry', 'windows phone', 'opera mini'
  ];
  
  const hasMobileUserAgent = mobileKeywords.some(keyword => 
    userAgent.includes(keyword)
  );
  
  // Check for touch capability and screen size
  const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth <= 768; // Typical mobile/tablet breakpoint
  
  // A device is considered mobile if it has mobile user agent OR (has touch + small screen)
  return hasMobileUserAgent || (hasTouchScreen && isSmallScreen);
}

/**
 * Gets the recommended input profile based on device type
 * @returns "touchscreen" for mobile devices, "trackpad" for desktop/laptop
 */
export function getRecommendedInputProfile(): "touchscreen" | "trackpad" {
  return isMobileDevice() ? "touchscreen" : "trackpad";
}