const signInDialog = document.getElementById("signInDialog");
const registrationDialog = document.getElementById("registrationDialog");
const forgetPassDialog = document.getElementById("forgetPassDialog");
const deleteMapDialog = document.getElementById("deleteMapDialog");
const projectSelectionDialog = document.getElementById(
  "projectSelectionDialog"
);
const checkCodeRegistrationDialog = document.getElementById(
  "checkCodeRegistrationDialog"
);
const checkCodeRecoverDialog = document.getElementById(
  "checkCodeRecoverDialog"
);
const blurDiv = document.getElementById("blurDiv");
const EMAIL_REGEXP =
  /^(([^<>()[\].,;:\s@"]+(\.[^<>()[\].,;:\s@"]+)*)|(".+"))@(([^<>()[\].,;:\s@"]+\.)+[^<>()[\].,;:\s@"]{2,})$/iu;
const specialCharRegex = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;

const buildingPageBtn = document.getElementById("buildingPageBtn");

const logoutBtn = document.getElementById("logoutBtn");

//переключение между диалогами
const registrateBtnForm = document.getElementById("registrateBtnForm");
const forgetPassBtn = document.getElementById("forgetPassBtn");
const signInBtnForm = document.getElementById("signInBtnForm");
const signInBtnForm2 = document.getElementById("signInBtnForm2");

//кнопки отправки формы
const signInBtn = document.getElementById("signInBtn");
const registrateBtn = document.getElementById("registrateBtn");
const recoverPassBtn = document.getElementById("recoverPassBtn");

const closeButtons = document.querySelectorAll(".close-modal-button");

//инпуты
const loginSignIn = document.getElementById("loginSignIn");
const passwordSignIn = document.getElementById("passwordSignIn");

const loginRegistration = document.getElementById("loginRegistration");
const emailRegistration = document.getElementById("emailRegistration");
const passRegistration = document.getElementById("passRegistration");
const repeatPassRegistration = document.getElementById(
  "repeatPassRegistration"
);
const nameProj = document.getElementById("nameProject");

const emailForgetPass = document.getElementById("emailForgetPass");
const passwordForgetPass = document.getElementById("passwordForgetPass");

//errors
const loginSignInError = document.getElementById("loginSignInError");
const passwordSignInError = document.getElementById("passwordSignInError");

const loginRegistrationError = document.getElementById(
  "loginRegistrationError"
);
const emailRegistrationError = document.getElementById(
  "emailRegistrationError"
);
const passRegistrationError = document.getElementById("passRegistrationError");
const repeatPassRegistrationError = document.getElementById(
  "repeatPassRegistrationError"
);
const emailForgetPassError = document.getElementById("emailForgetPassError");
const passwordForgetPassError = document.getElementById(
  "passwordForgetPassError"
);

const codeForgetPassError = document.getElementById("codeForgetPassError");
const codeRegistrationError = document.getElementById("codeRegistrationError");

let authHeader;
let isReg = false;

// обработчики кнопок
closeButtons.forEach((button) => {
  button.addEventListener("click", (e) => {
    e.preventDefault();
    const dialog = button.closest("dialog");
    dialog.close();
    isSwitching = false;
    blurDiv.classList.remove("blur");
  });
});

let isSwitching = false; //переключение

if (logoutBtn) {
  logoutBtn.addEventListener("click", (e) => {
    e.preventDefault();
    fetch("/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    })
      .then((response) => {
        if (response.ok) {
          location.reload();
        }
      })
      .catch((error) => console.error("Ошибка выхода:", error));
  });
}

buildingPageBtn.addEventListener("click", (e) => {
  e.preventDefault();
});

signInDialog.addEventListener("close", () => {
  if (!isSwitching) {
    blurDiv.classList.remove("blur");
  }
  isSwitching = false;
});
registrationDialog.addEventListener("close", () => {
  if (!isSwitching) {
    blurDiv.classList.remove("blur");
  }
  isSwitching = false;
});
forgetPassDialog.addEventListener("close", () => {
  if (!isSwitching) {
    blurDiv.classList.remove("blur");
  }
  isSwitching = false;
});
checkCodeRecoverDialog.addEventListener("close", () => {
  if (!isSwitching) {
    blurDiv.classList.remove("blur");
  }
  isSwitching = false;
});
checkCodeRegistrationDialog.addEventListener("close", () => {
  if (!isSwitching) {
    blurDiv.classList.remove("blur");
  }
  isSwitching = false;
});
projectSelectionDialog.addEventListener("close", () => {
  blurDiv.classList.remove("blur");
  document.querySelector(".content-project-selection-dialog").style.display =
    "";
  projectSelectionDialog.style.height = "";
  document.querySelector(".create-project-section").style.display = "none";
  document.querySelector(".show-projects-section").style.display = "none";
  document.querySelector(".project-selection-title").innerText =
    "Начните свой проект";
});
//переключение между диалогами
registrateBtnForm.addEventListener("click", (e) => {
  e.preventDefault();
  isSwitching = true;
  signInDialog.close();
  registrationDialog.showModal();
});
forgetPassBtn.addEventListener("click", (e) => {
  e.preventDefault();
  isSwitching = true;
  console.log(isSwitching);
  signInDialog.close();
  forgetPassDialog.showModal();
});
signInBtnForm.addEventListener("click", (e) => {
  e.preventDefault();
  isSwitching = true;
  registrationDialog.close();
  signInDialog.showModal();
});
signInBtnForm2.addEventListener("click", (e) => {
  e.preventDefault();
  isSwitching = true;
  forgetPassDialog.close();
  signInDialog.showModal();
});

deleteMapDialog.addEventListener("close", () => {
  updateBlurState();
});

function closeDeleteMapDialog() {
  deleteMapDialog.close();
}

function updateBlurState() {
  const isProjectDialogOpen =
    projectSelectionDialog &&
    (projectSelectionDialog.hasAttribute("open") ||
      projectSelectionDialog.open);

  if (!isProjectDialogOpen && blurDiv) {
    blurDiv.classList.remove("blur");
    return true;
  } else {
    return false;
  }
}
//отправка формы
signInBtn.addEventListener("click", (e) => {
  e.preventDefault();
  resetSignInErrors();
  const loginValue = loginSignIn.value.trim();
  const passwordValue = passwordSignIn.value.trim();

  if (!loginValue) {
    showError(loginSignIn, loginSignInError, "Пожалуйста, введите логин.");
    return;
  }

  if (!passwordValue) {
    showError(
      passwordSignIn,
      passwordSignInError,
      "Пожалуйста, введите пароль."
    );
    return;
  }
  const formData = {
    email: loginSignIn.value,
    password: passwordSignIn.value,
  };
  fetch("http://localhost:5050/auth/signin", {
    method: "POST",
    headers: {
      "Content-Type": "application/json", // Убедитесь, что заголовок установлен
    },
    body: JSON.stringify(formData),
  })
    .then((response) => {
      return response.json().then((data) => {
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
    .then((data) => {
      location.reload();
    })
    .catch((error) => {
      console.error("Ошибка авторизации:", error);
      // Здесь можно также обработать другие ошибки, если нужно
    });
  //отправка на сервер
});
registrateBtn.addEventListener("click", (e) => {
  e.preventDefault();
  resetRegErrors();
  const login = loginRegistration.value.trim();
  const email = emailRegistration.value.trim();
  const password = passRegistration.value;
  const repeat_password = repeatPassRegistration.value;

  if (!login) {
    showError(
      loginRegistration,
      loginRegistrationError,
      "Пожалуйста, введите логин."
    );
    return;
  }
  if (!email) {
    showError(
      emailRegistration,
      emailRegistrationError,
      "Пожалуйста, введите почту."
    );
    return;
  }

  if (!isEmailValid(email)) {
    showError(
      emailRegistration,
      emailRegistrationError,
      "Неккоректный формат почты."
    );
    return;
  }
  if (!isPassValid(password, passRegistrationError, passRegistration)) {
    return;
  }
  if (!repeat_password) {
    showError(
      repeatPassRegistration,
      repeatPassRegistrationError,
      "Пожалуйста, повторите пароль."
    );
    return;
  }
  if (password !== repeat_password) {
    showError(
      repeatPassRegistration,
      repeatPassRegistrationError,
      "Пароли не совпадают."
    );
    return;
  }
  const bodyrequest = {
    username: login,
    email: email,
    password: password,
  };
  fetch("http://localhost:5050/auth/registration", {
    method: "POST",
    contentType: "application/json",
    body: JSON.stringify(bodyrequest),
  }).then((response) => {
    return response.json().then((data) => {
      if (!response.ok) {
        // Если ответ не успешен, проверяем наличие сообщения
        if (data.message) {
          showError(null, repeatPassRegistrationError, data.message);
        }
        return Promise.reject(data);
      }
      console.log(data.code); // TEST
      authHeader = response.headers.get("Authorization");
      isReg = true;
      e.preventDefault();
      isSwitching = true;
      registrationDialog.close();
      checkCodeRegistrationDialog.showModal();
      return data; // Возвращаем успешно полученные данные
    });
  });
  //отправка на сервер
});

recoverPassBtn.addEventListener("click", (e) => {
  e.preventDefault();
  resetRegErrors();
  resetRecoverErrors();
  const email = emailForgetPass.value.trim();
  const newpass = passwordForgetPass.value.trim();

  if (!email) {
    showError(
      emailForgetPass,
      emailForgetPassError,
      "Пожалуйста, введите почту."
    );
    return;
  }
  if (!newpass) {
    showError(
      passwordForgetPass,
      passwordForgetPassError,
      "Пожалуйста, введите новый пароль."
    );
    return;
  }
  if (!isEmailValid(email)) {
    showError(
      emailForgetPass,
      emailForgetPassError,
      "Неккоректный формат почты."
    );
    return;
  }
  if (!isPassValid(newpass, passwordForgetPassError, passwordForgetPass)) {
    return;
  }
  const bodyrequest = {
    email: email,
    password: newpass,
  };
  fetch("http://localhost:5050/auth/recover", {
    method: "POST",
    contentType: "application/json",
    body: JSON.stringify(bodyrequest),
  }).then((response) => {
    return response.json().then((data) => {
      if (!response.ok) {
        // Если ответ не успешен, проверяем наличие сообщения
        if (data.message) {
          showError(null, passwordForgetPassError, data.message);
        }
        return Promise.reject(data);
      }
      console.log(data.code); // TEST
      authHeader = response.headers.get("Authorization");
      isReg = false;
      e.preventDefault();
      isSwitching = true;
      forgetPassDialog.close();
      checkCodeRecoverDialog.showModal();
      return data; // Возвращаем успешно полученные данные
    });
  });
  //отправка на сервер
});

function openSignInDialogBtn() {
  blurDiv.classList.add("blur");
  signInDialog.showModal();
}

//переход к некст инпуту кода
function moveToNext(currentInput, nextInputId) {
  // Если текущее поле не пустое, перемещаем фокус на следующее поле
  if (currentInput.value.length >= 1 && nextInputId) {
    document.getElementById(nextInputId).focus();
  }
}

//проверка на число
function isNumberKey(evt) {
  const charCode = evt.which ? evt.which : evt.keyCode;
  // Разрешаем только цифры (0-9)
  if (charCode < 48 || charCode > 57) {
    evt.preventDefault(); // Запрещаем ввод
    return false;
  }
  return true;
}

//проверяем 6 инпутов
function checkAllFilled() {
  let id;
  if (isReg) {
    id = "#confirmationCodeRegistration";
  } else {
    id = "#confirmationCodeRecovery";
  }
  const inputsRegistration = document.querySelectorAll(id + " .code-input"); //получаем все инпуты внутри блока
  const allFilled = Array.from(inputsRegistration).every(
    (input) => input.value.length === 1
  );
  resetInputStyles(inputsRegistration);
  if (allFilled) {
    const code = Array.from(inputsRegistration)
      .map((input) => input.value)
      .join("");
    let email;
    let url;
    let errField;
    if (isReg) {
      email = emailRegistration.value.trim();
      url = "http://localhost:5050/auth/check_code_registration";
      errField = codeRegistrationPassError;
    } else {
      email = emailForgetPass.value.trim();
      url = "http://localhost:5050/auth/check_code_recover";
      errField = codeForgetPassError;
    }
    console.log("email:", email);
    body = {
      email: email,
      code: code,
    };
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })
      .then((response) => {
        return response.json().then((data) => {
          if (!response.ok) {
            if (data.message) {
              showError(null, errField, data.message);
            }
            throw new Error(data.message || "Ошибка сервера");
          }
          return data;
        });
      })
      .then((data) => {
        if (isReg) {
          location.href = "/";
        } else {
          isSwitching = true;
          checkCodeRecoverDialog.close();
          signInDialog.showModal();
        }
      })
      .then((data) => {
        if (!data?.unlock_at) {
          throw new Error("Не получено время разблокировки");
        }

        const unlockTime = new Date(data.unlock_at);
        if (isNaN(unlockTime.getTime())) {
          throw new Error(`Некорректный формат времени: ${data.unlock_at}`);
        }

        const updateTimer = () => {
          const now = new Date();
          const diff = unlockTime - now;
          console.log(now);
          if (diff <= 0) {
            clearInterval(interval);
            showCanField(
              errField,
              "Можете пробовать снова.",
              inputsRegistration
            );
            return;
          }

          const totalSeconds = Math.floor(diff / 1000);
          const minutes = Math.floor(totalSeconds / 60);
          const seconds = totalSeconds % 60;

          const timeString = `${minutes.toString().padStart(2, "0")}:${seconds
            .toString()
            .padStart(2, "0")}`;
          showError(
            errField,
            `Слишком большое количество попыток, попробуйте снова через: ${timeString}`
          );
        };

        // Первое обновление сразу
        updateTimer();

        // Затем каждую секунду
        const interval = setInterval(updateTimer, 1000);

        return { interval, unlockTime };
      });
  }

  return allFilled;
}

// 1. Функция для удаления цифры с переходом на предыдущий input
function handleDeleteCodeInput(currentInput, event) {
  // Предотвращаем стандартное поведение Backspace
  event.preventDefault();

  const currentId = currentInput.id;
  const currentIndex = parseInt(currentId.match(/\d+$/)[0]);

  // Если input не пустой - просто очищаем его
  if (currentInput.value !== "") {
    currentInput.value = "";
    return;
  }

  // Если input пустой - переходим на предыдущий
  if (currentInput.value === "") {
    const prevInput = document.getElementById(
      currentId.replace(/\d+$/, currentIndex - 1)
    );
    if (prevInput) {
      prevInput.focus();
      // Очищаем предыдущий input при фокусировке
      prevInput.value = "";
    }
  }
}

// 2. Функция для вставки кода из буфера обмена
async function handlePasteCodeInput(event, inputsContainerId) {
  let pasteData;

  if (event.type === "paste") {
    // Для обычного события paste
    event.preventDefault();
    pasteData = event.clipboardData.getData("text/plain").trim();
  } else {
    // Для Ctrl+V попробуем получить данные из буфера
    try {
      pasteData = await navigator.clipboard.readText();
    } catch (error) {
      console.error("Ошибка чтения буфера обмена:", error);
      return;
    }
  }

  // Проверяем что в буфере 4 цифры
  if (pasteData && /^\d{4}$/.test(pasteData)) {
    const inputs = document.querySelectorAll(
      `#${inputsContainerId} .code-input`
    );

    // Заполняем все inputs
    inputs.forEach((input, index) => {
      input.value = pasteData[index] || "";
    });

    // Фокусируемся на последнем input
    inputs[inputs.length - 1].focus();

    // Проверяем все ли заполнено
    checkAllFilled();
  }
}

// 3. Обновленная функция handleKeyDown с учетом новой логики удаления
async function handleKeyDown(event, inputElement) {
  // Обработка удаления
  if (event.key === "Backspace") {
    handleDeleteCodeInput(inputElement, event);
    return;
  }

  // Обработка Ctrl+V
  if ((event.ctrlKey || event.metaKey) && event.key === "v") {
    const containerId = inputElement.closest(".code-input-block").id;
    await handlePasteCodeInput(event, containerId);
    return;
  }

  // Проверка что вводится цифра
  if (!isNumberKey(event)) {
    event.preventDefault();
    return;
  }
}
// 4. Обновление инициализации - добавление обработчика paste
function initCodeInputs() {
  document.querySelectorAll(".code-input-block").forEach((container) => {
    const inputs = container.querySelectorAll(".code-input");

    inputs.forEach((input) => {
      // Добавляем обработчик paste
      input.addEventListener("paste", (e) => {
        handlePasteCodeInput(e, container.id);
      });

      // Обработчик keydown
      input.addEventListener("keydown", function (e) {
        handleKeyDown(e, this);
      });

      // Обработчик input для автоматического перехода
      input.addEventListener("input", function () {
        const nextId = this.id.replace(/\d+$/, (match) =>
          String(parseInt(match) + 1)
        );
        const nextInput = document.getElementById(nextId);

        if (this.value.length >= 1 && nextInput) {
          nextInput.focus();
        }

        checkAllFilled();
      });
    });
  });
}

// Инициализация при загрузке страницы
document.addEventListener("DOMContentLoaded", initCodeInputs);

function resetInputStyles(inputs) {
  inputs.forEach((input) => {
    input.style.borderColor = "";
    input.style.background = "";
  });
  codeForgetPassError.style.display = "none";
}

function selectProject() {
  blurDiv.classList.add("blur");
  projectSelectionDialog.showModal();
}
function goBuilding() {
  fetch("http://localhost:5050/maps/redactor", {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json", // Явно указываем, что ожидаем JSON
    },
  })
    .then((response) => {
      return response.json().then((data) => {
        if (data.redirect_url) {
          window.location.href = data.redirect_url;
        } else {
          window.location.href = `/maps/redactor/page`;
        }
      });
    })
    .catch((error) => {
      console.error("Ошибка:", error);
      // Можно показать пользователю сообщение об ошибке
    });
}

function showError(input, field, text) {
  field.innerText = text;
  field.style.display = "block";
  input.style.borderColor = "red";
}

function resetSignInErrors() {
  loginSignInError.style.display = "none";
  passwordSignInError.style.display = "none";
  loginSignIn.style.borderColor = "transparent";
  passwordSignIn.style.borderColor = "transparent";
}

function resetRegErrors() {
  loginRegistrationError.style.display = "none";
  emailRegistrationError.style.display = "none";
  passRegistrationError.style.display = "none";
  repeatPassRegistrationError.style.display = "none";
  loginRegistration.style.borderColor = "transparent";
  emailRegistration.style.borderColor = "transparent";
  passRegistration.style.borderColor = "transparent";
  repeatPassRegistration.style.borderColor = "transparent";
}

function resetRecoverErrors() {
  emailForgetPassError.style.display = "none";
  passwordForgetPassError.style.display = "none";
  emailForgetPass.style.borderColor = "transparent";
  passwordForgetPass.style.borderColor = "transparent";
}

function isEmailValid(value) {
  return EMAIL_REGEXP.test(value);
}

//проверка пароля
function isPassValid(value, field, input) {
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
function showCreateProjectForm() {
  // Получаем высоту окна просмотра
  const viewportHeight = window.innerHeight;

  // Определяем высоту диалога в зависимости от высоты экрана
  let dialogHeight;
  if (viewportHeight < 700) {
    dialogHeight = "50%";
  } else if (viewportHeight < 800) {
    dialogHeight = "40%";
  } else {
    dialogHeight = "35%";
  }

  // Применяем изменения
  projectSelectionDialog.style.height = dialogHeight;
  document.querySelector(".content-project-selection-dialog").style.display =
    "none";
  document.querySelector(".create-project-section").style.display = "flex";
}
function toggleErrorNameProject(message = "", show = false) {
  const errorElement = document.getElementById("nameProjectError");
  if (show && message) {
    errorElement.textContent = message;
    errorElement.style.display = "block";
    nameProj.style.borderColor = "#a90000";
    document.getElementById("nameProject").classList.add("input-error");
  } else {
    errorElement.style.display = "none";
    nameProj.style.borderColor = "";

    document.getElementById("nameProject").classList.remove("input-error");
  }
}
function createNewProject() {
  let nameProjVal = nameProj.value;
  toggleErrorNameProject("", false);
  if (!nameProjVal) {
    toggleErrorNameProject("Название проекта не может быть пустым", true);
    return;
  }
  if (nameProjVal.length < 5) {
    toggleErrorNameProject(
      "Название должно содержать минимум 5 символов",
      true
    );
    return;
  }
  if (nameProjVal.length > 100) {
    toggleErrorNameProject("Название не должно превышать 100 символов", true);
    return;
  }
  if (specialCharRegex.test(nameProjVal)) {
    toggleErrorNameProject("Название содержит запрещенный символ", true);
    return;
  }
  const requestData = {
    name_map: nameProjVal,
  };
  fetch("http://localhost:5050/maps/create", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(requestData),
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((err) => {
          // Показываем пользователю сообщение об ошибке
          toggleErrorNameProject(
            err.error || "Ошибка при создании карты",
            true
          );
          throw new Error(err.error || `Ошибка сервера: ${response.status}`);
        });
      }

      return response.json();
    })
    .then((data) => {
      selectMap(data.map_id, true);
    })
    .catch((error) => {
      console.error("Ошибка:", error);
      if (!error.message.includes("Ожидался JSON")) {
        toggleErrorNameProject(error.message, true);
      }
    });
}
function showProjects() {
  document.querySelector(".content-project-selection-dialog").style.display =
    "none";
  document.querySelector(".show-projects-section").style.display = "block";
  document.querySelector(".project-selection-title").innerText = "Мои проекты";
  loadMaps();
}
function loadMaps() {
  fetch("http://localhost:5050/maps/get_maps", {
    method: "GET",
    credentials: "include",
  })
    .then((response) => {
      const contentType = response.headers.get("content-type");

      if (!contentType || !contentType.includes("application/json")) {
        return response.text().then((text) => {
          throw new Error(
            `Ожидался JSON, но получен: ${text.slice(0, 100)}...`
          );
        });
      }

      if (!response.ok) {
        return response.json().then((err) => {
          throw new Error(err.error || `Ошибка сервера: ${response.status}`);
        });
      }

      return response.json();
    })
    .then((data) => {
      const projectsSection = document.querySelector(".show-projects-section");
      projectsSection.innerHTML = ""; // Очищаем секцию перед заполнением

      // Проверяем, что данные есть и это массив
      if (Array.isArray(data) && data.length > 0) {
        renderMaps(data);
        // Показываем секцию
        projectsSection.style.display = "block";
      } else {
        projectsSection.innerHTML = "<p>Нет доступных проектов</p>";
        projectsSection.style.display = "block";
      }
    })
    .catch((error) => {
      console.error("Ошибка:", error);
      const projectsSection = document.querySelector(".show-projects-section");
      projectsSection.innerHTML = `<p>Ошибка загрузки: ${error.message}</p>`;
      projectsSection.style.display = "block";
    });
}
function renderMaps(maps) {
  const projectsSection = document.querySelector(".show-projects-section");
  projectsSection.innerHTML = "";

  maps.forEach((map) => {
    const projectItem = document.createElement("div");
    projectItem.className = "project-item";
    projectItem.dataset.mapId = map.map_id; // Сохраняем ID в data-атрибуте

    projectItem.innerHTML = `
            <div class="project-info">
                <p class="project-name">${map.map_name || "Без названия"}</p>
                <p class="project-date">${formatDate(
                  new Date(map.map_created)
                )}</p>
            </div>
            <button class="project-delete">
                <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3.75 7.5H6.25M6.25 7.5H26.25M6.25 7.5V25C6.25 25.663 6.51339 26.2989 6.98223 26.7678C7.45107 27.2366 8.08696 27.5 8.75 27.5H21.25C21.913 27.5 22.5489 27.2366 23.0178 26.7678C23.4866 26.2989 23.75 25.663 23.75 25V7.5M10 7.5V5C10 4.33696 10.2634 3.70107 10.7322 3.23223C11.2011 2.76339 11.837 2.5 12.5 2.5H17.5C18.163 2.5 18.7989 2.76339 19.2678 3.23223C19.7366 3.70107 20 4.33696 20 5V7.5" stroke="#1E1E1E" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>
        `;
    const deleteBtn = projectItem.querySelector(".project-delete");
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      showDeleteMapDialog(map.map_name, map.map_id, projectItem);
    });

    projectsSection.appendChild(projectItem);
  });

  // Добавляем обработчики событий
  addMapEventListeners();
}
// Функция показа диалога удаления
function showDeleteMapDialog(mapName, mapId, element) {
  const dialog = document.getElementById("deleteMapDialog");
  const title = document.getElementById("titleDialog");

  // Устанавливаем название карты в диалог
  title.textContent = `Вы уверены что хотите удалить проект ${mapName}?`;

  // Показываем диалог
  dialog.showModal();

  // Обработчик подтверждения удаления
  const confirmBtn = document.getElementById("confirmDelMapBtn");
  const oldHandler = confirmBtn.onclick;
  confirmBtn.onclick = function () {
    if (oldHandler) oldHandler();
    handleDeleteMap(mapId, element);
    dialog.close();
  };
}
async function handleDeleteMap(mapId, element) {
  try {
    const response = await fetch("http://localhost:5050/maps/delete", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        map_id: mapId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to delete module");
    }

    element.remove();

    return await response.json();
  } catch (error) {
    console.error("Delete module error:", error);
    throw error;
  }
}
function addMapEventListeners() {
  document.querySelectorAll(".project-item").forEach((item) => {
    // Обработчик для всей карточки (если нужно)
    item.addEventListener("click", (e) => {
      // Проверяем, что клик не по кнопке удаления
      if (!e.target.closest(".project-delete")) {
        const mapId = item.dataset.mapId;
        selectMap(mapId, false); // Ваша функция для открытия карты
      }
    });
  });
}

function selectMap(mapId, is_first_launch) {
  fetch(`/maps/redactor?map_id=${mapId}&is_first_launch=${is_first_launch}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((err) => {
          throw new Error(err.error || `Ошибка сервера: ${response.status}`);
        });
      }
      return response.json();
    })
    .then((data) => {
      // Перенаправляем на страницу выбора места
      if (data.redirect_url) {
        window.location.href = data.redirect_url;
      }
    })
    .catch((error) => {
      console.error("Ошибка:", error);
    });
}
function formatDate(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}
