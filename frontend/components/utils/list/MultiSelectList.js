import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { FlatList } from 'react-native';

export default class MultiSelectList extends PureComponent {
    constructor(props) {
        super(props);
        this.keyExtractor = this.keyExtractor.bind(this);
    }

    keyExtractor(item, index) {
        const { step } = this.props;

        let key = index;
        if (item._id) {
            key = item._id;
        } else if (item.text) {
            key = item.text;
        } else if (item.key) {
            key = item.key;
        }

        return `${key}-${step}`;
    }

    render() {
        const { data, renderItem } = this.props;
        return (
            <FlatList
                scrollEnabled={false}
                data={data}
                extraData={this.state}
                keyExtractor={this.keyExtractor}
                renderItem={renderItem}
            />
        );
    }
}

MultiSelectList.defaultProps = {
    step: 0,
};

MultiSelectList.propTypes = {
    data: PropTypes.array.isRequired,
    renderItem: PropTypes.func.isRequired,
    step: PropTypes.number,
};
