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

function calculateHoursFromSecond(timeInSecond) {
  const hours = parseInt(timeInSecond / 3600);
  const minutes = parseInt((timeInSecond % 3600) / 60);
  const seconds = parseInt(timeInSecond) % 60;
  return { hours, minutes, seconds };
}

// Example: 3661s -> 1:01:01, 361s -> 06:01
function convertSecondsToHours(timeInSecond) {
  const { hours, minutes, seconds } = calculateHoursFromSecond(timeInSecond);
  const hourNumber = hours > 0 ? `${hours}:` : '';
  const minuteNumber = minutes > 9 ? `${minutes}:` : `0${minutes}:`;
  const secondNumber = seconds > 9 ? seconds : `0${seconds}`;

  return `${hourNumber}${minuteNumber}${secondNumber}`;
}

function limitPercentValue(value, lowerLimit, upperLimit) {
  var limitedValue = value;
  if (limitedValue > upperLimit) {
    limitedValue = upperLimit;
  } else if (limitedValue < lowerLimit) {
    limitedValue = lowerLimit;
  }
  return limitedValue;
}
