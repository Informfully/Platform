# Informfully Platform

![Informfully](https://raw.githubusercontent.com/Informfully/Documentation/main/docs/source/img/logo_banner.png)

Welcome to [Informfully](https://informfully.ch/)!
Informfully is a open-source reproducibility platform for content distribution and user experiments.

To view the full documentation, please visit [Informfully at Read the Docs](https://informfully.readthedocs.io/).
It is the combined documentation for all [code repositories](https://github.com/orgs/Informfully/repositories).

**Links and Resources:** [Website](https://informfully.ch/) | [Documentation](https://informfully.readthedocs.io/) | [Informfully](https://github.com/orgs/Informfully/repositories) | [DDIS@UZH](https://www.ifi.uzh.ch/en/ddis.html) | [Google Play](https://play.google.com/store/apps/details?id=ch.uzh.ifi.news) | [App Store](https://apps.apple.com/us/app/informfully/id1460234202)

## Installation

This project was bootstrapped with [Create React Native App](https://github.com/react-community/create-react-native-app).
In case you need more information about React Native, the most recent version of this guide is available [here](https://github.com/expo/create-react-native-app/blob/master/README.md).

The following installation instructions are an abbreviated version for quickly getting you set and ready. You can access the full [Platform documentation here](https://informfully.readthedocs.io/en/latest/quick.html).

### Download the Code

Informfully is a React Native app that uses a Meteor servers as back end. Download the code and Meteor as follows:

```bash
# Download the source code
git clone https://github.com/Informfully/Platform.git

# Install all packages
cd backend
meteor npm install
```

After you downloaded the code, you need to verify the React Native Packager Hostname. We have a small guide for Mac, Linux, and Windows. Find more on [Installation Instructions](https://informfully.readthedocs.io/en/latest/install.html) in the documentation.

### Run the Code

Once everything is downloaded, all you need to do is to run the back end and connect it with the front end. You can then start the server with:

```bash
# To run the server on port 3008
# Settings configured for the development environment...
./meteor-start.sh

# ...and...
bash meteor-start.sh

# ...or by specifying --port directly to run the server with
meteor --port 3008 --settings settings-dev.json
```

Make sure that you are specifying the same port for the back end that you are using in the [React Native App](https://github.com/Informfully/Platform/blob/main/frontend/App.js).
Find more on [Local Development](https://informfully.readthedocs.io/en/latest/development.html) in the documentation.

### Deploy the Code

After development and testing your instance of Informfully, you are ready to deploy your solution.
For your convenience, we have created a script that automatically deploys the back end to any local or cloud server.
Navigate to the main directory of your codebase end execute the following script:

```bash
# Deploy back end on the server
bash build.sh
```

Deploment of the front end is done via Google Play for Android and XCode for iOS.
Find more on [Back End Deployment](https://informfully.readthedocs.io/en/latest/deployment.html) and [Front End Deployment](https://informfully.readthedocs.io/en/latest/native.html) in the documentation.

### Demo

Test versions are available to download if you want to have a quick look at the app.
Reach out to use to get a demo account: info@informfully.ch

<p align="center">
  <img src="https://github.com/Informfully/Documentation/blob/main/docs/source/gif/animation.gif?raw=true" height="680"/>
</p>

Android (v5.1 and newer)            |  iOS (v13.0 and newer)
:-------------------------:|:-------------------------:
[![Google Play](https://raw.githubusercontent.com/Informfully/Documentation/main/docs/source/img/storefront_assets/google-play.png)](https://play.google.com/store/apps/details?id=ch.uzh.ifi.news) | [![App Store](https://raw.githubusercontent.com/Informfully/Documentation/main/docs/source/img/storefront_assets/appstore.png)](https://apps.apple.com/de/app/informfully/id1460234202)

## Citation
If you use any Informfully code/repository in a scientific publication, we ask you to cite the following papers:

- [Deliberative Diversity for News Recommendations - Operationalization and Experimental User Study](https://dl.acm.org/doi/10.1145/3604915.3608834), Heitz *et al.*, Proceedings of the 17th ACM Conference on Recommender Systems, 813–819, 2023.

  ```
  @inproceedings{heitz2023deliberative,
    title={Deliberative Diversity for News Recommendations: Operationalization and Experimental User Study},
    author={Heitz, Lucien and Lischka, Juliane A and Abdullah, Rana and Laugwitz, Laura and Meyer, Hendrik and Bernstein, Abraham},
    booktitle={Proceedings of the 17th ACM Conference on Recommender Systems},
    pages={813--819},
    year={2023}
  }
  ```

- [Benefits of Diverse News Recommendations for Democracy: A User Study](https://www.tandfonline.com/doi/full/10.1080/21670811.2021.2021804), Heitz *et al.*, Digital Journalism, 10(10): 1710–1730, 2022.

  ```
  @article{heitz2022benefits,
    title={Benefits of diverse news recommendations for democracy: A user study},
    author={Heitz, Lucien and Lischka, Juliane A and Birrer, Alena and Paudel, Bibek and Tolmeijer, Suzanne and Laugwitz, Laura and Bernstein, Abraham},
    journal={Digital Journalism},
    volume={10},
    number={10},
    pages={1710--1730},
    year={2022},
    publisher={Taylor \& Francis}
  }
  ```

## Collaboration

Do you want to use Informfully, but there is no infrastructure that you can use? Informfully can be used as a hosted serivce. We offer to collaborate with you in your scientific experiments and provide you access to the research infrastructure.

Feel free to reach out to us: info@informfully.ch

## Contributing
Your are welcome to contribute to the Informfully ecosystem and become a part of your community. Feel free to:
  - fork any of the [Informfully repositories](https://github.com/Informfully)
  - join and the [dicussion board](https://github.com/orgs/Informfully/discussions)
  - make changes and create pull requests

Please post your feature requests and bug reports in our [GitHub issues](https://github.com/Informfully/Documentation/issues) section.

## License
Released under the [MIT License](LICENSE). (Please note that the respective copyright licenses of third-party libraries and dependencies apply.)

![Screenshots](https://raw.githubusercontent.com/Informfully/Documentation/main/docs/source/img/app_screens.png)
