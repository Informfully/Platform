import { FlowRouter } from 'meteor/kadira:flow-router';
import React from 'react';
import { mount } from 'react-mounter';
import PublicPages from '../../../../ui/PublicPages';
import NotFound from '../../../../ui/pages/NotFound';

// name of the route that's used if the requested route
// cannot be found (404).
// is also used / returned in {@link firstGrantedRoute}
export const ROUTE_NOT_FOUND = 'not-found';

FlowRouter.notFound = {
    name: ROUTE_NOT_FOUND,
    action() {
        mount(PublicPages, {
            main: (
                <NotFound />
            ),
        });
    },
};
