// API access controller
let apiAccessController = class {
    constructor() {
        this.url = 'https://diat-api.herokuapp.com';
        this.apiEndpointLogin = '/login';
        this.apiEndpointConnect = '/connect';
        this.apiEndpointRead = '/read';
        this.apiEndpointUpdate = '/update';
        this.apiEndpointDelete = '/delete';
        this.apiEndpointStatus = '/status';
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

    createStatusRequest() {
        return this.createXMLHttpRequest('POST', this.url + this.apiEndpointStatus);
    }
};


// Database controller
let databaseController = class {
    constructor() {
        this.databaseModal = document.getElementById('database-modal');
        this.databaseModalBody = document.querySelector('#database-modal .modal-card-body');
        this.databaseModalCloseButton = document.querySelector('#database-modal .delete');
        this.databaseID = null;
        this.databaseChangeEvent = new Event('dbchange');
        this.ondbchange = function() {};
        this.init();
    }

    init() {
        let self = this;
        this.databaseModal.addEventListener('dbchange', function() {
            self.ondbchange();
        });
        this.databaseModalCloseButton.addEventListener('click', function() {
            self.hideDatabaseSelection();
        });
    }

    showDatabaseSelection() {
        this.databaseModal.classList.add('is-active');
    }

    hideDatabaseSelection() {
        this.databaseModal.classList.remove('is-active');
    }

    removeAllDatabases() {
        while(this.databaseModalBody.firstChild) {
            this.databaseModalBody.firstChild.remove();
        }
    }

    addDatabases(databases, activeDatabaseID) {
        this.removeAllDatabases();
        this.databaseID = activeDatabaseID;
        databases.forEach(function(database) {
            let self = this;
            let radio = document.createElement('input');
            let label = document.createElement('label');
            radio.setAttribute('type', 'radio');
            radio.setAttribute('name', 'database');
            radio.id = database.database_id;
            if(radio.id == activeDatabaseID) {
                radio.checked = true;
            }
            radio.addEventListener('click', function() {
                if(this.id != self.databaseID) {
                    self.databaseID = this.id;
                    self.databaseModal.dispatchEvent(self.databaseChangeEvent);
                }
                self.hideDatabaseSelection();
            });
            label.htmlFor = database.database_id;
            label.innerHTML = `${database.database_name} <span class='is-pulled-right is-hidden-mobile'>${database.images_remaining} images remaining</span>`;
            this.databaseModalBody.appendChild(radio);
            this.databaseModalBody.appendChild(label);
        }, this);
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
            options[option.id.replace(/-/g, '_')] = option.checked;
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
    let statusButton = document.getElementById('button-status');
    let userInfoField = document.getElementById('user-info');
    let imageToRender = document.getElementById('image');
    let imageToLoad = new Image();
    let apiController = new apiAccessController();
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
        let xhr = apiController.createLoginRequest();
        xhr.onload = function() {
            let response = JSON.parse(this.response);
            if(this.status == 200 && response.success) {
                // success
                accessKey = response.access_key;
                buttonLocked = false;
                userInfoField.innerHTML = '<i class="fas fa-user-circle"></i>&nbsp;&nbsp;' + response.allocated_to;
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
            let xhr = apiController.createConnectRequest();
            xhr.onload = function() {
                let response = JSON.parse(this.response);
                if(this.status == 200 && response.success) {
                    // success
                    dbController.ondbchange = function() {
                        databaseID = dbController.databaseID;
                        noteController.notify('CONNECTED', ['is-link'], 2500);
                        nextButton.click();
                    };
                    dbController.addDatabases(response.databases, databaseID);
                    dbController.showDatabaseSelection();
                }
                else {
                    // server error
                    console.log('ERROR: databaseButton ->', this.status, response.success);
                    noteController.notify('INTERNAL SERVER ERROR', ['is-danger'], 2500);
                }
                el.classList.remove('is-loading');
                buttonLocked = false;
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
            let xhr = apiController.createReadRequest();
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
            let xhr = apiController.createUpdateRequest();
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
            let xhr = apiController.createDeleteRequest();
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

    // status button
    statusButton.addEventListener('click', function() {
        if(!buttonLocked && databaseID) {
            buttonLocked = true;
            this.classList.add('is-loading');
            let el = this;
            let data = JSON.stringify({
                'access_key': accessKey,
                'database_id': databaseID
            });
            let xhr = apiController.createStatusRequest();
            xhr.onload = function() {
                let response = JSON.parse(this.response);
                if(this.status == 200 && response.success) {
                    // success
                    let statusMessage = `UPDATED&nbsp;&nbsp;<strong>${response.updated}</strong>&nbsp;&nbsp;&nbsp;&nbsp;DELETED&nbsp;&nbsp;<strong>${response.deleted}</strong>`;
                    noteController.notify(statusMessage, ['is-link'], 2500);
                }
                else {
                    // server error
                    console.log('ERROR: statusButton ->', this.status, response.success);
                    noteController.notify('INTERNAL SERVER ERROR', ['is-danger'], 2500);
                }
                el.classList.remove('is-loading');
                buttonLocked = false;
            };
            xhr.onerror = function() {
                // connection error
                console.log('ERROR: statusButton ->', this.status);
                noteController.notify('CONNECTION TIMEOUT', ['is-danger'], 2500);
                el.classList.remove('is-loading');
                buttonLocked = false;
            };
            xhr.send(data);
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
