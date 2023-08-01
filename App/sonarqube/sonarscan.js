const scanner = require('sonarqube-scanner');

scanner(
    {
        serverUrl: 'http://localhost:9000',
        token: "9ea789f6acc5401a3606079581abf3e96b9261a7",
        options: {
            'sonar.projectName': 'GreenSite-Backend',
            'sonar.projectDescription': 'Here I can add a description of my project',
            'sonar.projectKey': 'Mind123',
            'sonar.projectVersion': '0.0.1',
            'sonar.exclusions': '',
            'sonar.sourceEncoding': 'UTF-8',
        }
    },
    () => process.exit()
)