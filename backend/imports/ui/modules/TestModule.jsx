import React from 'react';
import Module from '../layout/Module';
import ModuleSection from '../layout/ModuleSection';

export default function TestModule() {
    return (
        <Module>
            <ModuleSection>
                <div className="level">
                    <div className="level-left">
                        <div className="level-item">
                            <h1 className="module-title">
                                Module Name
                            </h1>
                        </div>
                    </div>
                    <div className="level-right">
                        <div className="level-item">
                            <a>some navigation</a>
                        </div>
                        <div className="level-item">
                            <a>or other stuff</a>
                        </div>
                    </div>
                </div>
            </ModuleSection>

            <ModuleSection card content>
                lorem ipsum dolor sit amet
                lorem ipsum dolor sit amet
                lorem ipsum dolor sit amet
                lorem ipsum dolor sit amet
                lorem ipsum dolor sit amet
                lorem ipsum dolor sit amet
                lorem ipsum dolor sit amet
                lorem ipsum dolor sit amet
                lorem ipsum dolor sit amet
                lorem ipsum dolor sit amet
                lorem ipsum dolor sit amet
                lorem ipsum dolor sit amet
                lorem ipsum dolor sit amet
                lorem ipsum dolor sit amet
                lorem ipsum dolor sit amet
                lorem ipsum dolor sit amet
                lorem ipsum dolor sit amet
                lorem ipsum dolor sit amet
                lorem ipsum dolor sit amet
            </ModuleSection>

            <ModuleSection card content>
                lorem ipsum dolor sit amet
                lorem ipsum dolor sit amet
                lorem ipsum dolor sit amet
                lorem ipsum dolor sit amet
                lorem ipsum dolor sit amet
                lorem ipsum dolor sit amet
                lorem ipsum dolor sit amet
                lorem ipsum dolor sit amet
                lorem ipsum dolor sit amet
                lorem ipsum dolor sit amet
                lorem ipsum dolor sit amet
                lorem ipsum dolor sit amet
                lorem ipsum dolor sit amet
                lorem ipsum dolor sit amet
                lorem ipsum dolor sit amet
                lorem ipsum dolor sit amet
                lorem ipsum dolor sit amet
                lorem ipsum dolor sit amet
                lorem ipsum dolor sit amet
            </ModuleSection>


            <ModuleSection between>
                dolor sit amet
            </ModuleSection>

            <ModuleSection card content>
                <div className="columns">
                    <div className="column">
                        lorem ipsum
                    </div>
                    <div className="column">
                        lorem ipsum
                    </div>
                    <div className="column">
                        lorem ipsum
                    </div>
                </div>
                <div className="columns">
                    <div className="column">
                        lorem ipsum
                    </div>
                    <div className="column">
                        lorem ipsum
                    </div>
                    <div className="column">
                        lorem ipsum
                    </div>
                </div>
            </ModuleSection>

            <ModuleSection card content>
                <div className="columns">
                    <div className="column">
                        lorem ipsum
                    </div>
                    <div className="column">
                        lorem ipsum
                    </div>
                    <div className="column">
                        lorem ipsum
                    </div>
                </div>
                <div className="columns">
                    <div className="column">
                        lorem ipsum
                    </div>
                    <div className="column">
                        lorem ipsum
                    </div>
                    <div className="column">
                        lorem ipsum
                    </div>
                </div>
            </ModuleSection>

            <ModuleSection>
                <div className="column" style={{ backgroundColor: 'red', border: '1px solid yellow' }}>
                    <div style={{ backgroundColor: 'blue' }}>
                        ok
                    </div>
                </div>
                <div className="column" style={{ backgroundColor: 'red', border: '1px solid yellow' }}>
                    ok
                </div>
                <div className="column" style={{ backgroundColor: 'red', border: '1px solid yellow' }}>
                    ok
                </div>
                <div className="column" style={{ backgroundColor: 'red', border: '1px solid yellow' }}>
                    ok
                </div>
            </ModuleSection>
            <div className="columns">
                <div className="column" style={{ backgroundColor: 'red', border: '1px solid yellow' }}>
                    <div style={{ backgroundColor: 'blue' }}>
                        ok
                    </div>
                </div>
                <div className="column" style={{ backgroundColor: 'red', border: '1px solid yellow' }}>
                    ok
                </div>
                <div className="column" style={{ backgroundColor: 'red', border: '1px solid yellow' }}>
                    ok
                </div>
                <div className="column" style={{ backgroundColor: 'red', border: '1px solid yellow' }}>
                    ok
                </div>
            </div>
            <div className="columns">
                <div className="column" style={{ backgroundColor: 'red', border: '1px solid yellow' }}>

                    <div className="columns">
                        <div className="column" style={{ backgroundColor: 'red', border: '1px solid yellow' }}>
                            <div style={{ backgroundColor: 'blue' }}>
                                ok
                            </div>
                        </div>
                        <div className="column" style={{ backgroundColor: 'red', border: '1px solid yellow' }}>
                            ok
                        </div>
                    </div>

                </div>
                <div className="column" style={{ backgroundColor: 'red', border: '1px solid yellow' }}>

                    <div className="columns">
                        <div className="column" style={{ backgroundColor: 'green', border: '1px solid black' }}>
                            <div style={{ backgroundColor: 'grey' }}>
                                ok
                            </div>
                        </div>
                        <div className="column" style={{ backgroundColor: 'green', border: '1px solid black' }}>
                            ok
                        </div>
                    </div>

                </div>
            </div>
        </Module>
    );
}
