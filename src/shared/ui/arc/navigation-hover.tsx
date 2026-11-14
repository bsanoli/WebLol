import { useLayoutEffect, useState } from "react";
import type { PointerEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import { motionTokens } from "./motion-tokens";
import styles from "./navigation-hover.module.css";

const glideRate = 2 * Math.PI / (0.3 * 1.2);
const glide = { type: "spring", stiffness: glideRate ** 2, damping: 2 * glideRate, mass: 1 } as const;
const immediate = { duration: 0 };

export function useNavigationHover(itemSelector: string) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  return {
    target,
    clear: () => setTarget(null),
    onPointerOver: (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType !== "mouse" || !(event.target instanceof Element)) return;
      const item = event.target.closest<HTMLElement>(itemSelector);
      if (item && event.currentTarget.contains(item)) setTarget(item);
    },
  };
}

export function NavigationHover({ target }: { target: HTMLElement | null }) {
  const reduced = useReducedMotion();
  const [frame, setFrame] = useState({ x: 0, y: 0, width: 0, height: 0, visible: false, glide: false });

  useLayoutEffect(() => {
    if (!target) {
      setFrame(previous => previous.visible ? { ...previous, visible: false, glide: false } : previous);
      return;
    }

    const update = () => {
      const { offsetLeft: x, offsetTop: y, offsetWidth: width, offsetHeight: height } = target;
      setFrame(previous => {
        if (previous.visible && previous.x === x && previous.y === y && previous.width === width && previous.height === height) return previous;
        return { x, y, width, height, visible: true, glide: previous.visible };
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(target);
    if (target.offsetParent) observer.observe(target.offsetParent);
    return () => observer.disconnect();
  }, [target]);

  return <motion.span
    aria-hidden="true"
    className={styles.highlight}
    initial={false}
    animate={{ x: frame.x, y: frame.y, width: frame.width, height: frame.height, opacity: frame.visible ? 1 : 0 }}
    transition={{
      default: reduced || !frame.glide ? immediate : glide,
      opacity: reduced ? immediate : { duration: motionTokens.duration.instant },
    }}
  />;
}
