document.addEventListener('DOMContentLoaded', function() {
    // Обработка кнопок "Выбрать"
    const submitButtons = document.querySelectorAll('.card-place-submit');
    submitButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            const placeName = this.closest('.card-place').querySelector('h3').dataset.name;
            selectPlace(placeName);
        });
    });

    // Обработка "Продолжить без выбора"
    document.querySelector('.footer-text').addEventListener('click', function() {
        selectPlace(null);
    });
});

// В choosePlace.js
function selectPlace(placeName) {
    if (placeName) {
      sessionStorage.setItem('temp_selected_place', placeName);
    }
    window.location.href = '/maps/redactor/page/map';
}