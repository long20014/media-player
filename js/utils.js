function getElement(elemId) {
  return document.getElementById(elemId);
}

function debounce(func, wait, immediate) {
  // 'private' variable for instance
  // The returned function will be able to reference this due to closure.
  // Each call to the returned function will share this common timer.
  var timeout;

  // use to cancel debounce
  function cancel() {
    clearTimeout(timeout);
  }

  // Calling debounce returns a new anonymous function
  function debounced() {
    // reference the context and args for the setTimeout function
    var context = this;
    var args = arguments;

    // Should the function be called now? If immediate is true
    //   and not already in a timeout then the answer is: Yes
    var callNow = immediate && !timeout;

    // This is the basic debounce behaviour where you can call this
    //   function several times, but it will only execute once
    //   [before or after imposing a delay].
    //   Each time the returned function is called, the timer starts over.
    clearTimeout(timeout);

    // Set the new timeout
    timeout = setTimeout(function () {
      // Inside the timeout function, clear the timeout variable
      // which will let the next execution run when in 'immediate' mode
      timeout = null;

      // Check if the function already ran with the immediate flag
      if (!immediate) {
        // Call the original function with apply
        // apply lets you define the 'this' object as well as the arguments
        //    (both captured before setTimeout)
        func.apply(context, args);
      }
    }, wait);

    // Immediate mode and no wait timer? Execute the function..
    if (callNow) func.apply(context, args);
  }
  debounced.cancel = cancel;
  return debounced;
}

function convertSecondsToHours(timeInSecond) {
  const hours = ((timeInSecond) => {
    const hourNumber = parseInt(timeInSecond / 3600);
    return hourNumber;
  })(timeInSecond);

  const minutes = ((timeInSecond) => {
    const minuteNumber = parseInt((timeInSecond % 3600) / 60);
    if (minuteNumber > 9) {
      return minuteNumber;
    }
    return '0' + minuteNumber;
  })(timeInSecond);

  const seconds = ((timeInSecond) => {
    const secondNumber = parseInt(timeInSecond) % 60;
    if (secondNumber > 9) {
      return secondNumber;
    }
    return '0' + secondNumber;
  })(timeInSecond);

  return `${hours > 0 ? hours + ':' : ''}${minutes}:${seconds}`;
}
