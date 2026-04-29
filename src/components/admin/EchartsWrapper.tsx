import React, { memo, useEffect, useRef } from "react";
import { Platform, View } from "react-native";

let EchartsComponent: any;
let echarts: any;

if (Platform.OS === "web") {
  echarts = require("echarts");
} else {
  EchartsComponent = require("react-native-echarts-pro").default;
}

interface EchartsWrapperProps {
  option: any;
  height?: number;
  onPress?: (e: any) => void;
}

const parseFunctions = (obj: any): any => {
  if (typeof obj === "string") {
    if (obj.trim().startsWith("function")) {
      try {
        // eslint-disable-next-line no-new-func
        return new Function("return " + obj)();
      } catch (e) {
        return obj;
      }
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(parseFunctions);
  }
  if (obj !== null && typeof obj === "object") {
    const newObj: any = {};
    for (const key in obj) {
      newObj[key] = parseFunctions(obj[key]);
    }
    return newObj;
  }
  return obj;
};

const EchartsWrapper = ({ option, height = 300, onPress }: EchartsWrapperProps) => {
  const chartRef = useRef<any>(null);
  const instanceRef = useRef<any>(null);

  if (Platform.OS === "web") {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      if (chartRef.current) {
        if (!instanceRef.current) {
          instanceRef.current = echarts.init(chartRef.current);
          if (onPress) {
            instanceRef.current.on("click", onPress);
          }
        }
        
        // Parse string functions into actual javascript functions for Web
        const webOption = parseFunctions(option);
        instanceRef.current.setOption(webOption);
      }

      const handleResize = () => {
        if (instanceRef.current) {
          instanceRef.current.resize();
        }
      };
      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
        if (instanceRef.current) {
          instanceRef.current.dispose();
          instanceRef.current = null;
        }
      };
    }, [option, onPress]);

    return (
      <View style={{ height, width: "100%" }}>
        <div ref={chartRef} style={{ width: "100%", height: "100%" }} />
      </View>
    );
  }

  // react-native-echarts-pro Native implementation
  return (
    <EchartsComponent 
      option={option} 
      height={height} 
      onPress={onPress} 
    />
  );
};

export default memo(EchartsWrapper);
