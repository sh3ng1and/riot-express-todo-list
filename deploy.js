var cmd = require('node-cmd');
var path, node_ssh, ssh, fs;
fs = require('fs');
path = require('path');
node_ssh = require('node-ssh');
ssh = new node_ssh();

// the method that starts the deployment process
function main() {
  console.log('Deployment started.');
  sshConnect();
}

// installs PM2
function installPM2() {
  return ssh.execCommand(
    'sudo npm install pm2 -g', {
      cwd: '/home/ubuntu'
  });
}

// transfers local project to the remote server
function transferProjectToRemote(failed, successful) {
  return ssh.putDirectory(
    '../riot-express-todo-list',
    '/home/ubuntu/riot-express-todo-list-temp',
    {
      recursive: true,
      concurrency: 1,
      validate: function(itemPath) {
        const baseName = path.basename(itemPath);
        return (
          baseName.substr(0, 1) !== '.' && baseName !== 'node_modules' // do not allow dot files
        ); // do not allow node_modules
      },
      tick: function(localPath, remotePath, error) {
        if (error) {
          failed.push(localPath);
          console.log('failed.push: ' + localPath);
        } else {
          successful.push(localPath);
          console.log('successful.push: ' + localPath);
        }
      }
    }
  );
}

// creates a temporary folder on the remote server
function createRemoteTempFolder() {
  return ssh.execCommand(
    'rm -rf -riot-express-todo-list-temp && mkdir riot-express-todo-list-temp', {
      cwd: '/home/ubuntu'
  });
}

// stops mongodb and node services on the remote server
function stopRemoteServices() {
  return ssh.execCommand(
    'pm2 stop all && sudo service mongod stop', {
      cwd: '/home/ubuntu'
  });
}

// updates the project source on the server
function updateRemoteApp() {
  return ssh.execCommand(
    'mkdir &riot-express-todo-list & cp -r riot-express-todo-list-temp/* riot-express-todo-list/ && rm -rf riot-express-todo-list-temp', {
      cwd: '/home/ubuntu'
  });
}

// restart mongodb and node services on the remote server
function restartRemoteServices() {
  return ssh.execCommand(
    'cd &riot-express-todo-list & sudo service mongod start && pm2 start app.js', {
      cwd: '/home/ubuntu'
  });
}

// connect to the remote server
function sshConnect() {
  console.log('Connecting to the server...');

  ssh
    .connect({
      // TODO: ADD YOUR IP ADDRESS BELOW (e.g. '12.34.5.67')
      host: '100.26.18.144',
      username: 'ubuntu',
      privateKey: 'riot-key.pem'
    })
    .then(function() {
      console.log('SSH Connection established.');
      console.log('Installing PM2...');
      return installPM2();
    })
    .then(function() {
      console.log('Creating `riot-express-todo-list-temp` folder.');
      return createRemoteTempFolder();
    })
    .then(function(result) {
      const failed = [];
      const successful = [];
      if (result.stdout) {
        console.log('STDOUT: ' + result.stdout);
      }
      if (result.stderr) {
        console.log('STDERR: ' + result.stderr);
        return Promise.reject(result.stderr);
      }
      console.log('Transferring files to remote server...');
      return transferProjectToRemote(failed, successful);
    })
    .then(function(status) {
      if (status) {
        console.log('Stopping remote services.');
        return stopRemoteServices();
      } else {
        return Promise.reject(failed.join(', '));
      }
    })
    .then(function(status) {
      if (status) {
        console.log('Updating remote app.');
        return updateRemoteApp();
      } else {
        return Promise.reject(failed.join(', '));
      }
    })
    .then(function(status) {
      if (status) {
        console.log('Restarting remote services...');
        return restartRemoteServices();
      } else {
        return Promise.reject(failed.join(', '));
      }
    })
    .then(function() {
      console.log('DEPLOYMENT COMPLETE!');
      process.exit(0);
    })
    .catch(e => {
      console.error(e);
      process.exit(1);
    });
}

main();
Within the deploy.js file, find the function sshConnect() (the last function in the file), and find where it says "TODO: ADD YOUR IP ADDRESS BELOW (e.g. '12.34.5.67')". Change the host field from all zeros to include your unique IP address from the EC2 instance.

Also make sure the file name and path for the hs-key.pem is correct based on your file's name and location within the privateKey field.

Caution!
When you stop and restart your instance, your IPv4 Public IP address will change. Be sure to update the IP address in your deploy.js file if this happens to your instance.

The content of the deploy.js file can seem intimidating at first due to its size. The good news is that the steps in this deployment process are relatively straightforward, ignoring the JavaScript syntax. The comments were added in the code to aid in readability. Additionally, the section below explains the parts of the deploy script.

deploy.js Breakdown
Import Libraries (Lines 1-6): The script is importing libraries that allow for SSH and command line instructions to be run from the JavaScript code:

var cmd = require('node-cmd');
var path, node_ssh, ssh, fs;
fs = require('fs');
path = require('path');
node_ssh = require('node-ssh');
ssh = new node_ssh();
Define the Main Method (Lines 9-12): The method is defined here, which calls upon another method (sshConnect()). The main method is invoked at the end of the file on the very last line of the file:

// the method that starts the deployment process
function main() {
  console.log('Deployment started.');
  sshConnect();
}
Install PM2 to Start/Stop Remote App (Lines 15-20): The installPM2() function will install PM2, which is a process manager for Node.js. If you recall, when you run npm start in the terminal/command-prompt, it tells you that you need to press Ctrl + C to terminate the process. So, when you run the deployment script, it will not complete since it will hang on the npm start call. Using pm2 allows you to start the process and return immediately.

// installs PM2
function installPM2() {
  return ssh.execCommand(
    'sudo npm install pm2 -g', {
      cwd: '/home/ubuntu'
  });
}
Additional Info!
You can read about how to start/stop processes using PM2 here: PM2 Runtime | Guide | Process Management.

Automate Transfer Files (Lines 23-47): The transferProjectToRemote will automate the process of transferring files to the server. This function is not run until it is called in the final function.

// transfers local project to the remote server
function transferProjectToRemote(failed, successful) {
  return ssh.putDirectory(
    '../riot-express-todo-list',
    '/home/ubuntu/riot-express-todo-list-temp',
    {
      recursive: true,
      concurrency: 1,
      validate: function(itemPath) {
        const baseName = path.basename(itemPath);
        return (
          baseName.substr(0, 1) !== '.' && baseName !== 'node_modules' // do not allow dot files
        ); // do not allow node_modules
      },
      tick: function(localPath, remotePath, error) {
        if (error) {
          failed.push(localPath);
          console.log('failed.push: ' + localPath);
        } else {
          successful.push(localPath);
          console.log('successful.push: ' + localPath);
        }
      }
    }
  );
}
