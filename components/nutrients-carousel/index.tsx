import { FC, useEffect, useRef, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import Animated, { SharedValue, withSpring } from 'react-native-reanimated';
import CarouselItem from './carousel-item';
import type { NutrientsItem } from './types';

// alma-nutrients-circular-carousel-animation 🔽

type Props = {
  slides: NutrientsItem[];
  animatedIndex: SharedValue<number>;
  currentIndex: SharedValue<number>;
};

// Spring physics tuned for smooth, natural circular carousel motion
// Higher damping (54) prevents overshoot on circular path transitions
// Stiffness (300) provides responsive movement without being too bouncy
// Mass (5.5) adds weight to the animation, making transitions feel deliberate
const SPRING_CONFIG = {
  damping: 54,
  stiffness: 300,
  mass: 5.5,
};

// Auto-advance interval: 2.5s balances visibility time with engagement
// Long enough to read content, short enough to maintain momentum
const ANIMATION_INTERVAL = 2500;

export const NutrientsCarousel: FC<Props> = ({ slides, animatedIndex, currentIndex }) => {
  // Extended slides array enables infinite scrolling by dynamically appending slides
  // Prevents visual gaps when reaching the end of the original array
  const [extendedSlides, setExtendedSlides] = useState<NutrientsItem[]>(slides);

  const { height: screenHeight } = useWindowDimensions();

  // Ref tracks extended array length to avoid stale closure issues in interval
  // Updated synchronously when slides are appended, ensuring accurate bounds checking
  const infiniteSlidesLengthRef = useRef(slides.length);

  useEffect(() => {
    setExtendedSlides(slides);
    infiniteSlidesLengthRef.current = slides.length;
  }, [slides]);

  // Auto-advance carousel with infinite scroll support
  // Checks 2 slides ahead to pre-append slides before visual gap appears
  useEffect(() => {
    const interval = setInterval(() => {
      const nextIndex = currentIndex.get() + 1;
      const currentExtendedLength = infiniteSlidesLengthRef.current;

      // Pre-append slides when approaching end to maintain seamless loop
      // Threshold of -2 ensures buffer slides are ready before they're needed
      if (nextIndex >= currentExtendedLength - 2) {
        setExtendedSlides((prev) => {
          const newSlides = [...prev, ...slides];
          infiniteSlidesLengthRef.current = newSlides.length;
          return newSlides;
        });
      }

      // Update discrete index so next tick reads the correct value
      currentIndex.set(nextIndex);
      // Spring animation ensures smooth transition between slides on circular path
      animatedIndex.set(withSpring(nextIndex, SPRING_CONFIG));
    }, ANIMATION_INTERVAL);

    return () => {
      clearInterval(interval);
    };
  }, [slides, currentIndex, animatedIndex]);

  return (
    // pointerEvents="none" allows touches to pass through carousel to underlying UI
    // overflow-hidden clips items outside circular path bounds
    <View pointerEvents="none" className="absolute inset-0 overflow-hidden">
      <Animated.View className="flex-1 flex-row items-end justify-center">
        {extendedSlides.map((slide, index) => (
          <CarouselItem
            key={`${slide.description}-${index}`}
            index={index}
            slide={slide}
            currentIndex={currentIndex}
            animatedIndex={animatedIndex}
            // Radius = half screen height creates semicircle arc at bottom
            // Items follow bottom half of circle, maximizing visible area
            radius={screenHeight / 2}
          />
        ))}
      </Animated.View>
    </View>
  );
};

// alma-nutrients-circular-carousel-animation 🔼
