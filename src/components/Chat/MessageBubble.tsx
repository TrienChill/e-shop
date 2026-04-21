import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type MessageBubbleProps = {
  message: string;
  isOwnMessage: boolean;
};

export const MessageBubble = ({ message, isOwnMessage }: MessageBubbleProps) => {
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
        ]}
      >
        <Text style={[styles.text, isOwnMessage ? styles.ownText : styles.otherText]}>
          {message}
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
    backgroundColor: '#007AFF', // iOS Blue
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#E5E5EA', // iOS Gray
    borderBottomLeftRadius: 4,
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
});
