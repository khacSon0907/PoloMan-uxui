let audioContext = null;

function getAudioContext() {
  if (audioContext) return audioContext;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  audioContext = new AudioContextClass();
  return audioContext;
}

function playTone(context, startTime, frequency, duration, gainValue) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(frequency, startTime);
  oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.18, startTime + duration);

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(gainValue, startTime + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.02);
}

export function playCartChime() {
  const context = getAudioContext();
  if (!context) return;

  if (context.state === "suspended") {
    context.resume().catch(() => {});
  }

  const now = context.currentTime + 0.01;
  playTone(context, now, 784, 0.12, 0.08);
  playTone(context, now + 0.13, 1174.66, 0.16, 0.075);
}

function getVisibleCartTarget() {
  const targets = Array.from(document.querySelectorAll("[data-cart-target]"));

  return (
    targets.find((target) => {
      const rect = target.getBoundingClientRect();
      const style = window.getComputedStyle(target);

      return (
        rect.width > 0 &&
        rect.height > 0 &&
        rect.bottom > 0 &&
        rect.top < window.innerHeight &&
        rect.left < window.innerWidth &&
        rect.right > 0 &&
        style.visibility !== "hidden" &&
        style.display !== "none" &&
        style.opacity !== "0"
      );
    }) || null
  );
}

function getCartTargetRect(cartTarget) {
  if (cartTarget) return cartTarget.getBoundingClientRect();

  return {
    left: window.innerWidth - 62,
    top: 22,
    width: 44,
    height: 44,
    right: window.innerWidth - 18,
    bottom: 66,
  };
}

function placeAtCenter(element, centerX, centerY, size) {
  element.style.left = `${centerX - size / 2}px`;
  element.style.top = `${centerY - size / 2}px`;
  element.style.width = `${size}px`;
  element.style.height = `${size}px`;
}

function createFallbackFlyer(startX, startY) {
  const flyer = document.createElement("div");
  const size = 58;

  flyer.style.background =
    "radial-gradient(circle at 35% 25%, #ffffff 0 18%, #34d399 19% 44%, #047857 45% 100%)";
  flyer.style.boxShadow = "0 20px 48px rgba(4, 120, 87, 0.38), 0 0 0 10px rgba(16, 185, 129, 0.12)";
  flyer.style.border = "2px solid rgba(255,255,255,0.9)";
  flyer.style.borderRadius = "999px";
  placeAtCenter(flyer, startX, startY, size);

  return flyer;
}

function createImageFlyer(imageElement, startX, startY) {
  const flyer = document.createElement("img");
  const size = 74;

  flyer.src = imageElement.currentSrc || imageElement.src;
  flyer.alt = "";
  placeAtCenter(flyer, startX, startY, size);
  flyer.style.objectFit = "cover";
  flyer.style.borderRadius = "20px";
  flyer.style.boxShadow = "0 22px 58px rgba(4, 120, 87, 0.42), 0 0 0 10px rgba(16, 185, 129, 0.13)";
  flyer.style.border = "2px solid rgba(255,255,255,0.95)";

  return flyer;
}

function createSpark(startX, startY, endX, endY, index) {
  const spark = document.createElement("div");
  const offset = index * 16 - 16;

  spark.style.position = "fixed";
  spark.style.left = `${startX - 5}px`;
  spark.style.top = `${startY - 5}px`;
  spark.style.width = "10px";
  spark.style.height = "10px";
  spark.style.borderRadius = "999px";
  spark.style.background = index === 1 ? "#facc15" : "#34d399";
  spark.style.boxShadow = "0 0 18px rgba(52, 211, 153, 0.85)";
  spark.style.zIndex = "9998";
  spark.style.pointerEvents = "none";
  document.body.appendChild(spark);

  spark
    .animate(
      [
        { transform: "translate3d(0,0,0) scale(1)", opacity: 0 },
        { transform: `translate3d(${offset}px,-28px,0) scale(1.15)`, opacity: 0.95 },
        {
          transform: `translate3d(${(endX - startX) * 0.72 + offset}px,${(endY - startY) * 0.72}px,0) scale(0.2)`,
          opacity: 0,
        },
      ],
      {
        duration: 620,
        delay: 60 + index * 45,
        easing: "cubic-bezier(.2,.8,.2,1)",
      },
    )
    .finished.finally(() => {
      spark.remove();
    });
}

export function playAddToCartEffect({ sourceElement, imageElement } = {}) {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  playCartChime();

  const cartTarget = getVisibleCartTarget();
  const source = sourceElement || imageElement;
  if (!source) return;

  const sourceRect = source.getBoundingClientRect();
  const targetRect = getCartTargetRect(cartTarget);
  if (!sourceRect.width || !sourceRect.height) return;

  const startX = sourceRect.left + sourceRect.width / 2;
  const startY = sourceRect.top + sourceRect.height / 2;
  const endX = targetRect.left + targetRect.width / 2;
  const endY = targetRect.top + targetRect.height / 2;
  const flyer =
    imageElement?.currentSrc || imageElement?.src
      ? createImageFlyer(imageElement, startX, startY)
      : createFallbackFlyer(startX, startY);
  const controlX = startX + (endX - startX) * 0.48;
  const controlY = Math.min(startY, endY) - Math.max(120, Math.abs(endX - startX) * 0.18);

  flyer.style.position = "fixed";
  flyer.style.zIndex = "9999";
  flyer.style.pointerEvents = "none";
  flyer.style.transformOrigin = "center";
  document.body.appendChild(flyer);

  const deltaX = endX - startX;
  const deltaY = endY - startY;
  const curveX = controlX - startX;
  const curveY = controlY - startY;

  [0, 1, 2].forEach((index) => createSpark(startX, startY, endX, endY, index));

  flyer
    .animate(
      [
        { transform: "translate3d(0,0,0) scale(0.82) rotate(0deg)", opacity: 0, filter: "saturate(1)" },
        { transform: "translate3d(0,-24px,0) scale(1.08) rotate(-5deg)", opacity: 1, filter: "saturate(1.25)" },
        {
          transform: `translate3d(${curveX}px,${curveY}px,0) scale(0.82) rotate(-9deg)`,
          opacity: 1,
          filter: "saturate(1.35)",
        },
        {
          transform: `translate3d(${deltaX}px,${deltaY}px,0) scale(0.16) rotate(14deg)`,
          opacity: 0.15,
          filter: "saturate(1.5)",
        },
      ],
      {
        duration: 780,
        easing: "cubic-bezier(.18,.82,.24,1)",
      },
    )
    .finished.finally(() => {
      flyer.remove();
    });

  if (cartTarget) {
    cartTarget.animate(
      [
        { transform: "scale(1)" },
        { transform: "scale(1.22) rotate(-8deg)" },
        { transform: "scale(0.96) rotate(5deg)" },
        { transform: "scale(1)" },
      ],
      {
        duration: 430,
        delay: 560,
        easing: "cubic-bezier(.2,.9,.2,1)",
      },
    );
  }
}
