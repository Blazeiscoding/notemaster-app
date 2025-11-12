const canVibrate = () =>
  typeof window !== "undefined" && "navigator" in window && "vibrate" in navigator;

const vibrate = (pattern: number | number[]) => {
  if (canVibrate()) {
    try {
      navigator.vibrate(pattern);
    } catch (error) {
      console.warn("Vibration not supported", error);
    }
  }
};

export const hapticLight = () => vibrate(10);

export const hapticMedium = () => vibrate([20, 15, 30]);

export const hapticSuccess = () => vibrate([25, 20, 40]);

export const hapticError = () => vibrate([40, 40, 40]);
