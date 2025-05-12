const signInDialog = document.getElementById("signInDialog");
const registrationDialog = document.getElementById("registrationDialog");
const forgetPassDialog = document.getElementById("forgetPassDialog");
const projectSelectionDialog = document.getElementById("projectSelectionDialog");
const blurDiv = document.getElementById("blurDiv");
const EMAIL_REGEXP = /^(([^<>()[\].,;:\s@"]+(\.[^<>()[\].,;:\s@"]+)*)|(".+"))@(([^<>()[\].,;:\s@"]+\.)+[^<>()[\].,;:\s@"]{2,})$/iu;

const buildingPageBtn = document.getElementById("buildingPageBtn");
const authBtn = document.getElementById("authBtn");

//переключение между диалогами
const registrateBtnForm = document.getElementById("registrateBtnForm");
const forgetPassBtn = document.getElementById("forgetPassBtn");
const signInBtnForm = document.getElementById("signInBtnForm");

//кнопки отправки формы
const signInBtn = document.getElementById("signInBtn");
const registrateBtn = document.getElementById("registrateBtn");
const recoverPassBtn = document.getElementById("recoverPassBtn");

const closeButtons = document.querySelectorAll('.close-modal-button');

//инпуты
const loginSignIn = document.getElementById("loginSignIn");
const passwordSignIn = document.getElementById("passwordSignIn");

const loginRegistration = document.getElementById("loginRegistration");
const emailRegistration = document.getElementById("emailRegistration");
const passRegistration = document.getElementById("passRegistration");
const repeatPassRegistration = document.getElementById("repeatPassRegistration");
//errors
const loginSignInError = document.getElementById("loginSignInError");
const passwordSignInError = document.getElementById("passwordSignInError");

const loginRegistrationError = document.getElementById("loginRegistrationError");
const emailRegistrationError = document.getElementById("emailRegistrationError");
const passRegistrationError = document.getElementById("passRegistrationError");
const repeatPassRegistrationError = document.getElementById("repeatPassRegistrationError");
const nameProjectError = document.getElementById("nameProjectError");
let authHeader;

closeButtons.forEach(button => {
  button.addEventListener('click', (e) => {
    e.preventDefault();
    const dialog = button.closest('dialog');
    dialog.close();
    blurDiv.classList.remove("blur");
    isSwitching = false;
  });
});

let isSwitching = false; //переключение 

authBtn.addEventListener('click', (e) => {
    e.preventDefault();
    blurDiv.classList.add("blur"); 
    signInDialog.showModal(); 
});
buildingPageBtn.addEventListener('click', (e) => {
    e.preventDefault();
});

signInDialog.addEventListener("close", () => {
    if(!isSwitching){
        blurDiv.classList.remove("blur"); 
    }
    isSwitching = false;
});
registrationDialog.addEventListener("close", () => {
    if(!isSwitching){
        blurDiv.classList.remove("blur"); 
    }
    isSwitching = false;
});
forgetPassDialog.addEventListener("close", () => {
    if(!isSwitching){
        blurDiv.classList.remove("blur"); 
    }
    isSwitching = false;
});
projectSelectionDialog.addEventListener("close", () => {
    blurDiv.classList.remove("blur"); 
    document.querySelector('.content-project-selection-dialog').style.display = '';
    projectSelectionDialog.style.height = '';
    document.querySelector('.create-project-section').style.display = 'none';
    document.querySelector('.show-projects-section').style.display = 'none';
    document.querySelector('.project-selection-title').innerText = 'Начните свой проект';
});
//переключение между диалогами
registrateBtnForm.addEventListener('click', (e) => {
    e.preventDefault();
    isSwitching = true;
    signInDialog.close();
    registrationDialog.showModal();
});
forgetPassBtn.addEventListener('click', (e) => {
    e.preventDefault();
    isSwitching = true;
    console.log(isSwitching);
    signInDialog.close();
    forgetPassDialog.showModal();
});
signInBtnForm.addEventListener('click', (e) => {
    e.preventDefault();
    isSwitching = true;
    registrationDialog.close();
    signInDialog.showModal();
});
signInBtnForm2.addEventListener('click', (e) => {
    e.preventDefault();
    isSwitching = true;
    forgetPassDialog.close();
    signInDialog.showModal();
});

//отправка формы
signInBtn.addEventListener('click', (e) => {
    e.preventDefault();
    resetSignInErrors(); 
    const loginValue = loginSignIn.value.trim(); 
    const passwordValue = passwordSignIn.value.trim(); 

    if (!loginValue) {
        showError(loginSignIn, loginSignInError, "Пожалуйста, введите логин.");
        return;
      }
    
    if (!passwordValue) {
        showError(passwordSignIn, passwordSignInError, "Пожалуйста, введите пароль.");
        return;
    }
    const formData = {
        email: loginSignIn.value,
        password: passwordSignIn.value,
    };
    fetch("http://localhost:5050/auth/signin", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json' // Убедитесь, что заголовок установлен
        },
        body: JSON.stringify(formData),
    })
        .then(response => {
            return response.json().then(data => {
                if (!response.ok) {
                    // Если ответ не успешен, проверяем наличие сообщения
                    if (data.message) {                    
                        showError(null, passwordSignInError, data.message);
                    }
                    return Promise.reject(data);
                }
                return data; // Возвращаем успешно полученные данные
            });
        })
        .then(data => {
            location.reload();
        })
        .catch(error => {
            console.error('Ошибка авторизации:', error);
            // Здесь можно также обработать другие ошибки, если нужно
        });
    //отправка на сервер
});
registrateBtn.addEventListener('click', (e) => {
    e.preventDefault();
    resetRegErrors();
    const login = loginRegistration.value.trim();
    const email = emailRegistration.value.trim();
    const password = passRegistration.value;
    const repeat_password = repeatPassRegistration.value;

    if (!login) {
        showError(loginRegistration, loginRegistrationError, "Пожалуйста, введите логин.");
        return;
    }
    if (!email) {
        showError(emailRegistration, emailRegistrationError , "Пожалуйста, введите почту.");
        return;
    }

    if (!isEmailValid(email)) {
        showError(emailRegistration, emailRegistrationError, "Неккоректный формат почты.");
        return;
    }
    if (!isPassValid(password, passRegistrationError, passRegistration)) {
        return;
    }
    if (!repeat_password) {
        showError(repeatPassRegistration, repeatPassRegistrationError, "Пожалуйста, повторите пароль.");
        return;
    }
    if (password !== repeat_password) {
        showError(repeatPassRegistration, repeatPassRegistrationError, "Пароли не совпадают.");
        return;
    }
    const bodyrequest = {
        username: login,
        email: email,
        password: password,
    }
    fetch("http://localhost:5050/auth/registration", {
        method: 'POST',
        contentType: 'application/json',
        body: JSON.stringify(bodyrequest)
    })
    .then (response => {
        return response.json().then(data => {
            if (!response.ok) {
                // Если ответ не успешен, проверяем наличие сообщения
                if (data.message) {
                    showError(null, passRegistrationError, data.message);
                }
                return Promise.reject(data);
            }
            console.log(data.code);// TEST
            authHeader = response.headers.get('Authorization')
            return data; // Возвращаем успешно полученные данные
        });
    })
    //отправка на сервер
});
recoverPassBtn.addEventListener('click', (e) => {
    e.preventDefault();
    resetRecoverErrors();
    
});
function selectProject(){
    blurDiv.classList.add("blur"); 
    projectSelectionDialog.showModal();
}
function goBuilding() {
    fetch("http://localhost:5050/maps/redactor", {
        method: 'GET',
        credentials: 'include',
    })
        .then(response => {
            const contentType = response.headers.get('content-type');

            if (!contentType || !contentType.includes('application/json')) {
                return response.text().then(text => {
                    throw new Error(`Ожидался JSON, но получен: ${text.slice(0, 100)}...`);
                });
            }

            if (!response.ok) {
                return response.json().then(err => {
                    throw new Error(err.error || `Ошибка сервера: ${response.status}`);
                });
            }

            return response.json();
        })
        .then(data => {
            window.location.href = `/maps/redactor/page`;
        })
        .catch(error => {
            console.error('Ошибка:', error);
        });
}

function showError(input, field, text) {
    field.innerText = text;
    field.style.display = "block";
    input.style.borderColor = 'red';
}
function resetSignInErrors() {
    loginSignInError.style.display = "none";
    passwordSignInError.style.display = "none";
    loginSignIn.style.borderColor = 'transparent';
    passwordSignIn.style.borderColor = 'transparent';
}
function resetRegErrors(){
    loginRegistrationError.style.display = "none";
    emailRegistrationError.style.display = "none";
    passRegistrationError.style.display = "none";
    repeatPassRegistrationError.style.display = "none";
    loginRegistration.style.borderColor = 'transparent';
    emailRegistration.style.borderColor = 'transparent';
    passRegistration.style.borderColor = 'transparent';
    repeatPassRegistration.style.borderColor = 'transparent';
}
function isEmailValid(value) {
    return EMAIL_REGEXP.test(value);
}

//проверка пароля
function isPassValid(value, field, input) {
    const specialCharRegex = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;
    if (!value) {
      showError(input, field, "Пожалуйста, введите пароль.");
      input.style.borderColor = "red";
      return false;
    }
    // Проверка длины пароля
    if (value.length < 5) {
      showError(input, field, "Пароль должен содержать не менее 5 символов.");
      input.style.borderColor = "red";
      return false;
    }
  
    // Проверка наличия специального символа в пароле
    if (!specialCharRegex.test(value)) {
      showError(
        input,
        field,
        "Пароль должен содержать хотя бы один специальный символ."
      );
      input.style.borderColor = "red";
      return false;
    }
    return true;
  }
  function showCreateProjectForm(){
    projectSelectionDialog.style.height = '35%';
    document.querySelector('.content-project-selection-dialog').style.display = 'none';
    document.querySelector('.create-project-section').style.display = 'flex';
  }
  function createNewProject(){
    let nameProj = document.getElementById('nameProject').value; //+валидация to do
    const requestData = {
        name_map: nameProj 
    };
    fetch("http://localhost:5050/maps/create", {
        method: 'POST',
        headers: {
            'content-type': 'application/json'
        },
        body: JSON.stringify(requestData)
    })
        .then(response => {
            const contentType = response.headers.get('content-type');

            if (!contentType || !contentType.includes('application/json')) {
                return response.text().then(text => {
                    throw new Error(`Ожидался JSON, но получен: ${text.slice(0, 100)}...`);
                });
            }

            if (!response.ok) {
                return response.json().then(err => {
                    throw new Error(err.error || `Ошибка сервера: ${response.status}`);
                });
            }

            return response.json();
        })
        .then(data => {
            selectMap(data.map_id, true);
        })
        .catch(error => {
            console.error('Ошибка:', error);
        });
  }
  function showProjects(){
    document.querySelector('.content-project-selection-dialog').style.display = 'none';
    document.querySelector('.show-projects-section').style.display = 'block';
    document.querySelector('.project-selection-title').innerText = 'Мои проекты';
    loadMaps();
  }
  function loadMaps() {
    fetch("http://localhost:5050/maps/get_maps", {
        method: 'GET',
        credentials: 'include',
    })
    .then(response => {
        const contentType = response.headers.get('content-type');

        if (!contentType || !contentType.includes('application/json')) {
            return response.text().then(text => {
                throw new Error(`Ожидался JSON, но получен: ${text.slice(0, 100)}...`);
            });
        }

        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(err.error || `Ошибка сервера: ${response.status}`);
            });
        }

        return response.json();
    })
    .then(data => {
        const projectsSection = document.querySelector('.show-projects-section');
        projectsSection.innerHTML = ''; // Очищаем секцию перед заполнением

        // Проверяем, что данные есть и это массив
        if (Array.isArray(data) && data.length > 0) {
            renderMaps(data);
            // Показываем секцию
            projectsSection.style.display = 'block';
        } else {
            projectsSection.innerHTML = '<p>Нет доступных проектов</p>';
            projectsSection.style.display = 'block';
        }
    })
    .catch(error => {
        console.error('Ошибка:', error);
        const projectsSection = document.querySelector('.show-projects-section');
        projectsSection.innerHTML = `<p>Ошибка загрузки: ${error.message}</p>`;
        projectsSection.style.display = 'block';
    });
}
function renderMaps(maps) {
    const projectsSection = document.querySelector('.show-projects-section');
    projectsSection.innerHTML = '';

    maps.forEach(map => {
        const projectItem = document.createElement('div');
        projectItem.className = 'project-item';
        projectItem.dataset.mapId = map.map_id; // Сохраняем ID в data-атрибуте
        
        projectItem.innerHTML = `
            <div class="project-info">
                <p class="project-name">${map.map_name || 'Без названия'}</p>
                <p class="project-date">${formatDate(new Date(map.map_created))}</p>
            </div>
            <button class="project-delete">
                <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3.75 7.5H6.25M6.25 7.5H26.25M6.25 7.5V25C6.25 25.663 6.51339 26.2989 6.98223 26.7678C7.45107 27.2366 8.08696 27.5 8.75 27.5H21.25C21.913 27.5 22.5489 27.2366 23.0178 26.7678C23.4866 26.2989 23.75 25.663 23.75 25V7.5M10 7.5V5C10 4.33696 10.2634 3.70107 10.7322 3.23223C11.2011 2.76339 11.837 2.5 12.5 2.5H17.5C18.163 2.5 18.7989 2.76339 19.2678 3.23223C19.7366 3.70107 20 4.33696 20 5V7.5" stroke="#1E1E1E" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>
        `;
        
        projectsSection.appendChild(projectItem);
    });

    // Добавляем обработчики событий
    addMapEventListeners();
}
function addMapEventListeners() {
    document.querySelectorAll('.project-item').forEach(item => {
        // Обработчик для всей карточки (если нужно)
        item.addEventListener('click', (e) => {
            // Проверяем, что клик не по кнопке удаления
            if (!e.target.closest('.project-delete')) {
                const mapId = item.dataset.mapId;
                selectMap(mapId, false); // Ваша функция для открытия карты
            }
        });

        // Обработчик для кнопки удаления
        const deleteBtn = item.querySelector('.project-delete');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Предотвращаем всплытие
                const mapId = item.dataset.mapId;
                deleteMap(mapId); // Ваша функция для удаления
            });
        }
    });
}

function selectMap(mapId, is_first_launch) {
    fetch(`/maps/redactor?map_id=${mapId}&is_first_launch=${is_first_launch}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include'
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(err.error || `Ошибка сервера: ${response.status}`);
            });
        }
        return response.json();
    })
    .then(data => {
        // Перенаправляем на страницу выбора места
        if (data.redirect_url) {
            window.location.href = data.redirect_url;
        }
    })
    .catch(error => {
        console.error('Ошибка:', error);
    });
}
//to do
function deleteMap(mapId) {

}
// Функция для форматирования даты в формат DD-MM-YYYY
function formatDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}
