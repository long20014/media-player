function hideNotificationFn() {
  $domElement.notification.classList.add('hidden');
}

function showNotification(type, messsage) {
  function showInfo() {
    $domElement.notification.classList.add('info');
    $domElement.notification.classList.remove('error');
    $domElement.notification.classList.remove('warning');
    $domElement.notification.classList.remove('hidden');
    $debounces.hideNotification();
  }
  function showError() {
    $domElement.notification.classList.add('error');
    $domElement.notification.classList.remove('info');
    $domElement.notification.classList.remove('warning');
    $domElement.notification.classList.remove('hidden');
    $debounces.hideNotification();
  }

  function showWarning() {
    $domElement.notification.classList.add('warning');
    $domElement.notification.classList.remove('info');
    $domElement.notification.classList.remove('error');
    $domElement.notification.classList.remove('hidden');
    $debounces.hideNotification();
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
  $domElement.notification.textContent = messsage;
}
