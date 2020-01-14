// Database controller
let databaseController = class {
    constructor() {
        this.url = 'https://diat-api.herokuapp.com';
        this.apiEndpointLogin = '/login';
        this.apiEndpointConnect = '/connect';
        this.apiEndpointRead = '/read';
        this.apiEndpointUpdate = '/update';
        this.apiEndpointDelete = '/delete';
    }

    createXMLHttpRequest(method, url) {
        let xhr = new XMLHttpRequest();
        xhr.open(method, url, true);
        xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
        return xhr;
    }

    createLoginRequest() {
        return this.createXMLHttpRequest('POST', this.url + this.apiEndpointLogin);
    }

    createConnectRequest() {
        return this.createXMLHttpRequest('POST', this.url + this.apiEndpointConnect);
    }

    createReadRequest() {
        return this.createXMLHttpRequest('POST', this.url + this.apiEndpointRead);
    }

    createUpdateRequest() {
        return this.createXMLHttpRequest('POST', this.url + this.apiEndpointUpdate);
    }

    createDeleteRequest() {
        return this.createXMLHttpRequest('POST', this.url + this.apiEndpointDelete);
    }
};


// Annotation controller
let annotationController = class {
    constructor() {
        this.allOptions = document.querySelectorAll('.custom-tab-container input[type="radio"]');
    }

    clearAllOptions() {
        this.allOptions.forEach(function(option) {
            option.checked = false;
        });
    }

    getAllOptions() {
        let options = {};
        this.allOptions.forEach(function(option) {
            options[option.id] = option.checked;
        });
        return options;
    }
};


// Notification controller
let notificationController = class {
    constructor() {
        this.notification = document.querySelector('.custom-notification');
        this.cssClassList = [...this.notification.classList];
    }

    removeClasses() {
        this.notification.className = '';
    }

    addClasses(cssClassList) {
        let self = this;
        [...this.cssClassList, ...cssClassList].forEach(function(cssClass) {
            self.notification.classList.add(cssClass);
        });
    }

    notify(message, cssClassList=[], duration=1000) {
        let self = this;
        this.notification.innerHTML = message;
        this.removeClasses();
        this.addClasses([...cssClassList, 'custom-fade-in']);
        setTimeout(function() {
            self.notification.classList.replace('custom-fade-in', 'custom-fade-out');
        }, duration);
    }
};


// Button controller
let buttonController = (function() {
    let buttons = document.querySelectorAll('button');
    let loginModal = document.getElementById('login-modal');
    let accessKeyField = document.getElementById('access-key');
    let loginButton = document.getElementById('button-login');
    let databaseButton = document.getElementById('button-database');
    let nextButton = document.getElementById('button-next');
    let saveButton = document.getElementById('button-save');
    let deleteButton = document.getElementById('button-delete');
    let optionsButton = document.getElementById('button-options');
    let imageToRender = document.getElementById('image');
    let imageToLoad = new Image();
    let dbController = new databaseController();
    let annoController = new annotationController();
    let noteController = new notificationController();
    let buttonLocked = true;
    let accessKey = null;
    let databaseID = null;
    let imageID = null;

    // removes outline from any button when state changes to focus or active
    buttons.forEach(function(button) {
        button.addEventListener('click', function() {
            this.blur();
        });
    });

    // login button
    loginButton.addEventListener('click', function() {
        this.classList.add('is-loading');
        let el = this;
        let data = JSON.stringify({
            'access_key': accessKeyField.value
        });
        let xhr = dbController.createLoginRequest();
        xhr.onload = function() {
            let response = JSON.parse(this.response);
            if(this.status == 200 && response.success) {
                // success
                accessKey = response.access_key;
                buttonLocked = false;
                loginModal.classList.remove('is-active');
                noteController.notify('LOGGED IN', ['is-link'], 2500);
            }
            else {
                // server error
                console.log('ERROR: loginButton ->', this.status, response.success);
                if(this.status == 200) {
                    noteController.notify('INVALID ACCESS KEY', ['is-danger'], 2500);
                }
                else {
                    noteController.notify('INTERNAL SERVER ERROR', ['is-danger'], 2500);
                }
            }
            accessKeyField.value = '';
            el.classList.remove('is-loading');
        };
        xhr.onerror = function() {
            // connection error
            console.log('ERROR: loginButton ->', this.status);
            noteController.notify('CONNECTION TIMEOUT', ['is-danger'], 2500);
            el.classList.remove('is-loading');
        };
        xhr.send(data);
    });

    // database button
    databaseButton.addEventListener('click', function() {
        if(!buttonLocked) {
            buttonLocked = true;
            this.classList.add('is-loading');
            let el = this;
            let data = JSON.stringify({
                'access_key': accessKey
            });
            let xhr = dbController.createConnectRequest();
            xhr.onload = function() {
                let response = JSON.parse(this.response);
                if(this.status == 200 && response.success) {
                    // success
                    databaseID = response.databases[0].database_id;
                    noteController.notify('CONNECTED', ['is-link'], 2500);
                }
                else {
                    // server error
                    console.log('ERROR: databaseButton ->', this.status, response.success);
                    noteController.notify('INTERNAL SERVER ERROR', ['is-danger'], 2500);
                }
                el.classList.remove('is-loading');
                buttonLocked = false;
                if(databaseID) {
                    nextButton.click();
                }
            };
            xhr.onerror = function() {
                // connection error
                console.log('ERROR: databaseButton ->', this.status);
                noteController.notify('CONNECTION TIMEOUT', ['is-danger'], 2500);
                el.classList.remove('is-loading');
                buttonLocked = false;
            };
            xhr.send(data);
        }
    });

    // next button
    nextButton.addEventListener('click', function() {
        if(!buttonLocked && databaseID) {
            buttonLocked = true;
            this.classList.add('is-loading');
            let el = this;
            let data = JSON.stringify({
                'access_key': accessKey,
                'database_id': databaseID
            });
            let xhr = dbController.createReadRequest();
            xhr.onload = function() {
                let response = JSON.parse(this.response);
                if(this.status == 200 && response.success) {
                    imageToLoad.onload = function() {
                        // success
                        imageToRender.classList.remove('custom-img-tinted');
                        imageToRender.src = imageToLoad.src;
                        annoController.clearAllOptions();
                        el.classList.remove('is-loading');
                        buttonLocked = false;
                    };
                    imageToLoad.onerror = function() {
                        // load error
                        console.log('ERROR: nextButton -> Failed to load image');
                        noteController.notify('FAILED TO LOAD IMAGE', ['is-danger'], 2500);
                        imageToRender.classList.remove('custom-img-tinted');
                        imageToRender.src = 'static/img/placeholder.jpg';
                        annoController.clearAllOptions();
                        el.classList.remove('is-loading');
                        buttonLocked = false;
                    };
                    imageID = response.image_id;
                    imageToLoad.src = response.image_url;
                }
                else {
                    // server error
                    console.log('ERROR: nextButton ->', this.status, response.success);
                    noteController.notify('INTERNAL SERVER ERROR', ['is-danger'], 2500);
                    el.classList.remove('is-loading');
                    buttonLocked = false;
                }
            };
            xhr.onerror = function() {
                // connection error
                console.log('ERROR: nextButton ->', this.status);
                noteController.notify('CONNECTION TIMEOUT', ['is-danger'], 2500);
                el.classList.remove('is-loading');
                buttonLocked = false;
            };
            xhr.send(data);
        }
    });

    // save button
    saveButton.addEventListener('click', function() {
        if(!buttonLocked && databaseID && imageID) {
            buttonLocked = true;
            this.classList.add('is-loading');
            let el = this;
            let data = JSON.stringify({
                'access_key': accessKey,
                'database_id': databaseID,
                'image_id': imageID,
                'annotation': annoController.getAllOptions()
            });
            let xhr = dbController.createUpdateRequest();
            xhr.onload = function() {
                let response = JSON.parse(this.response);
                if(this.status == 200 && response.success) {
                    // success
                    noteController.notify('SAVED', ['is-link'], 2500);
                }
                else {
                    // server error
                    console.log('ERROR: saveButton ->', this.status, response.success);
                    noteController.notify('INTERNAL SERVER ERROR', ['is-danger'], 2500);
                }
                el.classList.remove('is-loading');
                buttonLocked = false;
            };
            xhr.onerror = function() {
                // connection error
                console.log('ERROR: saveButton ->', this.status);
                noteController.notify('CONNECTION TIMEOUT', ['is-danger'], 2500);
                el.classList.remove('is-loading');
                buttonLocked = false;
            };
            xhr.send(data);
        }
    });

    // delete button
    deleteButton.addEventListener('click', function() {
        if(!buttonLocked && databaseID && imageID) {
            buttonLocked = true;
            this.classList.add('is-loading');
            let el = this;
            let data = JSON.stringify({
                'access_key': accessKey,
                'database_id': databaseID,
                'image_id': imageID
            });
            let xhr = dbController.createDeleteRequest();
            xhr.onload = function() {
                let response = JSON.parse(this.response);
                if(this.status == 200 && response.success) {
                    // success
                    imageID = null;
                    imageToRender.classList.add('custom-img-tinted');
                    noteController.notify('DELETED', ['is-link'], 2500);
                }
                else {
                    // server error
                    console.log('ERROR: deleteButton ->', this.status, response.success);
                    noteController.notify('INTERNAL SERVER ERROR', ['is-danger'], 2500);
                }
                el.classList.remove('is-loading');
                buttonLocked = false;
                if(!imageID) {
                    nextButton.click();
                }
            };
            xhr.onerror = function() {
                // connection error
                console.log('ERROR: deleteButton ->', this.status);
                noteController.notify('CONNECTION TIMEOUT', ['is-danger'], 2500);
                el.classList.remove('is-loading');
                buttonLocked = false;
            };
            xhr.send(data);
        }
    });

    // options button
    optionsButton.addEventListener('click', function() {
        if(!buttonLocked) {
            buttonLocked = true;
            buttonLocked = false;
        }
    });
})();


// Tab controller
let tabController = (function() {
    let tabLinks = document.querySelectorAll('.custom-tab-link');
    let tabContents = document.querySelectorAll('.custom-tab-content');

    let deactivateAllTabLinks = function() {
        tabLinks.forEach(function(tabLink) {
            tabLink.classList.remove('is-active');
        });
    };

    let deactivateAllTabContents = function() {
        tabContents.forEach(function(tabContent) {
            tabContent.style.display = 'none';
        });
    };

    let deactivateAllTabs = function() {
        deactivateAllTabLinks();
        deactivateAllTabContents();
    };

    let activateTabLink = function(tabLink) {
        tabLink.classList.add('is-active');
    };

    let activateTabContent = function(tabContent) {
        tabContent.style.display = 'block';
    };

    let activateTab = function(tabLink) {
        let tabIndex = [...tabLink.parentElement.children].indexOf(tabLink);
        activateTabLink(tabLink);
        activateTabContent(tabContents[tabIndex]);
    };

    tabLinks.forEach(function(tabLink) {
        tabLink.addEventListener('click', function() {
            deactivateAllTabs();
            activateTab(tabLink);
        });
    });

    tabLinks[0].click();
})();
