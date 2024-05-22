import React from 'react';
import Selection from './Selection';

export default function Answer({
    index,
    text,
    isSelected,
    onPress,
    onPressOther,
    item,
}) {
    const { _id } = item;
    const onPressItem = _id === 'otherAnswer' ? onPressOther : () => onPress(item);

    return (
        <Selection
            {...item}
            index={index}
            text={text}
            selected={isSelected}
            onPressItem={onPressItem}
        />
    );
}
