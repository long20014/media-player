function showNotification(type, messsage) {
  function setTimeoutToHideNotification() {
    setTimeout(() => {
      domElement.notify.classList.add('hidden');
    }, 2000);
  }
  function showInfo() {
    domElement.notify.classList.add('info');
    domElement.notify.classList.remove('error');
    domElement.notify.classList.remove('warning');
    domElement.notify.classList.remove('hidden');
    setTimeoutToHideNotification();
  }
  function showError() {
    domElement.notify.classList.add('error');
    domElement.notify.classList.remove('info');
    domElement.notify.classList.remove('warning');
    domElement.notify.classList.remove('hidden');
    setTimeoutToHideNotification();
  }

  function showWarning() {
    domElement.notify.classList.add('warning');
    domElement.notify.classList.remove('info');
    domElement.notify.classList.remove('error');
    domElement.notify.classList.remove('hidden');
    setTimeoutToHideNotification();
  }
  switch (type) {
    case 'info':
      showInfo();
      break;
    case 'error':
      showError();
      break;
    case 'warning':
      showWarning();
      break;
    default:
      showInfo();
  }
  domElement.notify.textContent = messsage;
}
