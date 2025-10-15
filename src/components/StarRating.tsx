import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  size?: number;
  readonly?: boolean;
  color?: string;
}

const StarRating: React.FC<StarRatingProps> = ({
  rating,
  onRatingChange,
  size = 24,
  readonly = false,
  color = '#fbbf24'
}) => {
  const stars = [1, 2, 3, 4, 5];

  const handlePress = (star: number) => {
    if (!readonly && onRatingChange) {
      onRatingChange(star);
    }
  };

  return (
    <View style={styles.container}>
      {stars.map((star) => {
        const isFilled = star <= rating;
        const isHalf = !isFilled && star - 0.5 === rating;

        return (
          <TouchableOpacity
            key={star}
            onPress={() => handlePress(star)}
            disabled={readonly}
            activeOpacity={readonly ? 1 : 0.7}
          >
            <MaterialIcons
              name={isFilled ? 'star' : isHalf ? 'star-half' : 'star-outline'}
              size={size}
              color={isFilled || isHalf ? color : '#9ca3af'}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 4,
  },
});

export default StarRating;
