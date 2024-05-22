/* eslint-disable max-len */
import React, { Component } from 'react';

// import logo from './logo_1024.png';


class Info extends Component {


    render() {

        const Image = {
            width: 150,
            borderRadius: 20,
            alignItems: 'center',
            margin: 30,

            // CSS CODE
        };

        const ImageButton = {
            width: 150,
            alignItems: 'center',
            margin: 30,

            // CSS CODE
        };
        const ImageContainer = {


            alignItems: 'center',
            textAlign: 'center',
            // CSS CODE
        };

        return (
            <div className="document">
                <div style={ImageContainer}>
                    <img style={Image} src="https://ddis-news.ifi.uzh.ch/images/logo_1024.png" />
                </div>
                <div className="document__head">Informfully</div>
                <div className="document__body">

                    <div style={ImageContainer}>

                        <p>Informfully is an app to examine reading behavior against the background of political orientation. The app serves as an aggregator of selected print media and is used in the context of scientific experiments. The aim is to research the effects of recommendation systems on consumer behavior.</p>
                    </div>

                    <div style={ImageContainer}>
                        <a href="https://play.google.com/store/apps/details?id=ch.uzh.ifi.news">
                            <img style={ImageButton} src="https://ddis-news.ifi.uzh.ch/images/gogp.png" />
                        </a>
                        <a href="https://apps.apple.com/de/app/ddis-news/id1460234202">

                            <img style={ImageButton} src="https://ddis-news.ifi.uzh.ch/images/aas.png" />
                        </a>
                    </div>


                    <h2>About this App</h2>
                    <p>
                        Aliquam tristique, tellus et vulputate sollicitudin, lectus nunc commodo nunc, et imperdiet diam
                        mauris id orci. Vivamus feugiat maximus ante nec placerat. Proin et ante id sapien faucibus
                        porta ac id quam. Nam consectetur aliquam consequat. Morbi mollis efficitur lacus, pharetra
                        tincidunt ligula bibendum quis. Nulla eget accumsan est, non venenatis purus. Duis gravida
                        sagittis dictum. Etiam consequat tincidunt eleifend. Morbi efficitur maximus augue, maximus
                        pretium est maximus at. Nam tristique, ligula et convallis fringilla, massa sapien varius purus,
                        nec gravida nibh nisi ac dui. Nam viverra lobortis dignissim. Aliquam congue odio sed nibh
                        semper consequat. Nulla dui dui, facilisis nec odio ac, porta vehicula massa. Ut tincidunt ipsum
                        augue, nec ullamcorper quam pulvinar id. Integer ut libero a turpis blandit vehicula eget eu
                        est. Curabitur eros neque, tincidunt a blandit ac, semper at ligula.
                    </p>

                    <h2>Morbi pulvinar est vitae dolor commodo</h2>
                    <p>
                        Vestibulum vitae ante pellentesque, venenatis erat non, semper nulla. Nulla fermentum ex dolor,
                        in tristique erat ultricies in. In ornare nulla sed massa luctus, a molestie tortor efficitur.
                        Sed in neque sed massa interdum congue vel ac ex. Nullam non luctus eros, non luctus augue.
                        Nullam condimentum porta nunc, eu auctor tortor ullamcorper ut. Sed mollis erat ac porttitor
                        lacinia. Curabitur ut felis nisl.
                    </p>

                    <h2>Nam vitae laoreet tortor</h2>
                    <p>
                        Sed fermentum, ligula vitae molestie vehicula, leo orci tincidunt tortor, et pellentesque ipsum
                        orci id turpis. Suspendisse eros nisl, hendrerit quis bibendum vel, pulvinar nec ante. Morbi
                        pulvinar est vitae dolor commodo, quis blandit metus tincidunt. Phasellus feugiat quam quis nunc
                        fringilla, id euismod mauris facilisis. Proin nunc augue, bibendum a accumsan tincidunt, congue
                        et risus. Fusce non risus urna. Nulla egestas accumsan vulputate. Duis consectetur lorem ut
                        sapien lobortis, at venenatis lectus tincidunt. Fusce facilisis magna vel erat eleifend, sit
                        amet commodo nulla mattis. Curabitur faucibus ante ac odio vulputate congue.
                    </p>

                    <h2>Phasellus feugiat quam quis nunc fringilla</h2>
                    <p>
                        Curabitur eget maximus elit, dignissim ultricies ipsum. Nullam non odio interdum, tincidunt felis
                        eget, mollis justo. Nam feugiat fringilla purus, feugiat malesuada odio eleifend nec. Vivamus et
                        ante a justo facilisis cursus. Curabitur quis accumsan leo. Nam vitae laoreet tortor. Vivamus
                        sed gravida velit. In velit dui, varius in cursus id, fermentum sed leo. Class aptent taciti
                        sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Proin tristique nisl ac
                        erat egestas, quis posuere arcu condimentum. Quisque vel enim non neque pharetra porta. Cras
                        massa orci, semper in lacus vel, vehicula malesuada nibh. Donec egestas, quam at vehicula
                        rhoncus, augue metus auctor risus, sit amet imperdiet nisi tellus id risus. Vivamus sit amet
                        consectetur urna. Fusce porta justo dapibus velit pellentesque, in ornare odio ornare.
                    </p>

                    <h2>Aenean vitae enim vulputate</h2>
                    <p>
                        Cras mollis, quam a semper aliquet, libero enim malesuada neque, et posuere eros neque at dolor.
                        Donec dictum vestibulum tellus, ut tempor nibh lobortis a. Nulla volutpat, libero ac blandit
                        pharetra, orci tellus molestie arcu, quis vehicula velit metus a est. Morbi vitae libero at quam
                        pretium imperdiet. Maecenas rhoncus tortor orci. Aenean vitae enim vulputate, varius arcu vitae,
                        cursus magna. Duis eget eleifend nulla. Pellentesque venenatis nibh erat, eu semper neque
                        egestas in. Ut eget felis dui. Curabitur id enim a ex vulputate euismod ac vitae massa. Quisque
                        non lacinia lectus, at dapibus nibh. Curabitur congue sapien vitae neque pulvinar, a dapibus
                        ligula porttitor.
                    </p>

                    <h2>Morbi efficitur maximus augue</h2>
                    <p>
                        Ut vel eros ut magna lacinia porta. Nunc ut mollis tellus. Suspendisse porta metus non erat
                        fermentum eleifend. Vestibulum ornare leo sit amet nunc semper pellentesque. Donec quam nibh,
                        euismod quis justo vel, scelerisque tristique dui. Suspendisse vel placerat nisi. Maecenas nunc
                        libero, fermentum vel orci eget, vulputate sollicitudin eros. Nulla metus augue, rhoncus quis
                        efficitur ut, finibus in nulla. Donec mattis nisl felis, eu venenatis elit fringilla et. Donec
                        tempor velit sit amet lacus fringilla vulputate. Curabitur vestibulum nisi et mattis aliquam.
                        Pellentesque commodo urna lorem, sed sollicitudin tortor fermentum et. Quisque ut magna a erat
                        elementum finibus. Morbi eros nisi, sagittis et dapibus eget, ornare non enim.
                    </p>

                    <h2>Mauris aliquam nulla arcu</h2>
                    <p>
                        Proin eget enim sollicitudin, finibus mi non, pulvinar massa. Nulla facilisi. Aliquam ultricies
                        elit lorem, nec mattis est gravida eu. Curabitur molestie convallis nulla, sit amet tempor enim
                        condimentum nec. Donec sit amet tristique mi. Aliquam eu consectetur justo. Maecenas lacus
                        massa, porttitor quis varius a, pulvinar sed odio. Curabitur ut elit at mauris porta finibus
                        porta non sem. Phasellus tincidunt felis urna, et vulputate nunc rutrum sit amet. Mauris aliquam
                        nulla arcu. Vestibulum pretium vestibulum elementum. Cras ut lacus at ante laoreet venenatis ut
                        non dolor. Aenean id dui in ligula commodo lacinia.
                    </p>

                </div>
            </div>
        );

    }
}


export default (Info);
