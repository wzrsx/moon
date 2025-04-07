const signInDialog = document.getElementById("signInDialog");
const registrationDialog = document.getElementById("registrationDialog");
const forgetPassDialog = document.getElementById("forgetPassDialog");
const blurDiv = document.getElementById("blurDiv");

const buildingPageBtn = document.getElementById("buildingPageBtn");
const authBtn = document.getElementById("authBtn");

//переключение между диалогами
const registrateBtnForm = document.getElementById("registrateBtnForm");
const forgetPassBtn = document.getElementById("forgetPassBtn");
const signInBtnForm = document.getElementById("signInBtnForm");

//кнопки отправки формы
const signInBtn = document.getElementById("signInBtn");
const registrateBtn = document.getElementById("registrateBtn");

const closeButtons = document.querySelectorAll('.close-modal-button');

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
});
registrateBtn.addEventListener('click', (e) => {
    e.preventDefault();
});

function goBuilding(){
    window.location.href = "/pages/building.html"
}