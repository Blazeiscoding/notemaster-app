type NavigatorWithLegacyVibrate = Navigator & {
  webkitVibrate?: Navigator['vibrate'];
  mozVibrate?: Navigator['vibrate'];
  msVibrate?: Navigator['vibrate'];
};

const getVibrateFn = () => {
  if (typeof window === "undefined" || !window.navigator) {
    return null;
  }

  const navigatorWithFallbacks = window.navigator as NavigatorWithLegacyVibrate;

  const vibrateFn =
    typeof navigatorWithFallbacks.vibrate === "function"
      ? navigatorWithFallbacks.vibrate
      : typeof navigatorWithFallbacks.webkitVibrate === "function"
        ? navigatorWithFallbacks.webkitVibrate
        : typeof navigatorWithFallbacks.mozVibrate === "function"
          ? navigatorWithFallbacks.mozVibrate
          : typeof navigatorWithFallbacks.msVibrate === "function"
            ? navigatorWithFallbacks.msVibrate
            : null;

  return vibrateFn ? vibrateFn.bind(navigatorWithFallbacks) : null;
};

const vibrate = (pattern: number | number[]) => {
  const vibrateFn = getVibrateFn();
  if (!vibrateFn) {
    return;
  }

  try {
    const result = vibrateFn(pattern);
    if (result === false) {
      console.warn("Vibration request was rejected by the device.");
    }
  } catch (error) {
    console.warn("Vibration not supported", error);
  }
};

export const supportsHaptics = () => Boolean(getVibrateFn());

export const hapticLight = () => vibrate(30);

export const hapticMedium = () => vibrate([40, 20, 60]);

export const hapticSuccess = () => vibrate([50, 30, 80]);

export const hapticError = () => vibrate([70, 40, 90]);
