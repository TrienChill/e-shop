import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

type MessageBubbleProps = {
  message: string;
  isOwnMessage: boolean;
  isSlowLoading?: boolean;
};

const DOTS = ['.', '..', '...'];

export const MessageBubble = ({ message, isOwnMessage, isSlowLoading }: MessageBubbleProps) => {
  const [dotIndex, setDotIndex] = useState(0);

  useEffect(() => {
    if (!isSlowLoading) return;

    const interval = setInterval(() => {
      setDotIndex((prev) => (prev + 1) % DOTS.length);
    }, 400);

    return () => clearInterval(interval);
  }, [isSlowLoading]);

  const displayText = isSlowLoading
    ? `A.I đang suy nghĩ${DOTS[dotIndex]}`
    : message;

  return (
    <View
      style={[
        styles.container,
        isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isOwnMessage ? styles.ownBubble : styles.otherBubble,
          isSlowLoading && styles.slowBubble,
        ]}
      >
        <Text
          style={[
            styles.text,
            isOwnMessage ? styles.ownText : styles.otherText,
            isSlowLoading && styles.slowText,
          ]}
        >
          {displayText}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 4,
    paddingHorizontal: 16,
    width: '100%',
  },
  ownMessageContainer: {
    justifyContent: 'flex-end',
  },
  otherMessageContainer: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  ownBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#E5E5EA',
    borderBottomLeftRadius: 4,
  },
  slowBubble: {
    backgroundColor: '#E5E5EA',
    borderBottomLeftRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    fontSize: 15,
    lineHeight: 20,
  },
  ownText: {
    color: '#FFF',
  },
  otherText: {
    color: '#000',
  },
  slowText: {
    color: '#6B7280',
    fontStyle: 'italic',
  },
});
