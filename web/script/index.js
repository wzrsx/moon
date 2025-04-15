const signInDialog = document.getElementById("signInDialog");
const registrationDialog = document.getElementById("registrationDialog");
const forgetPassDialog = document.getElementById("forgetPassDialog");
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
                        // Выводим сообщение об ошибке в нужном элементе
                        document.getElementById('passwordSignInError').innerText = data.message;
                        document.getElementById('passwordSignInError').style.display = 'block'; // Показываем элемент
                    }
                    return Promise.reject(data);
                }
                authHeader = response.headers.get('Authorization')
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
    //отправка на сервер
});
recoverPassBtn.addEventListener('click', (e) => {
    e.preventDefault();
    resetRecoverErrors();
    
});
function goBuilding(){
    window.location.href = "../pages/building.html"
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