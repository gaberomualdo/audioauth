// tabs functionality
const openTab = (tabIdx) => {
  document.querySelector('nav ul button.on').classList.remove('on');
  document.querySelector('nav ul button:nth-child(' + (tabIdx + 1) + ')').classList.add('on');

  document.querySelector('.container .tabs .tab.on').classList.remove('on');
  document.querySelector('.container .tabs .tab:nth-child(' + (tabIdx + 1) + ')').classList.add('on');

  window.dispatchEvent(new Event('resize'));
};

let updateRecordTimeInterval;
let recordTime = 0;

const record = async () => {
  const hasVerifyData = document.querySelector('.tab.authenticate-data').classList.contains('on');
  let verifyData = undefined;
  if (hasVerifyData) {
    verifyData = verifyDataEditor.getValue();
  }
  document.querySelector('.record').setAttribute('disabled', 'true');

  await startRecording();

  document.querySelector('.record').classList.add('recording');

  recordTime = 0;

  const update = async () => {
    recordTime += 1;
    let timeStr = (recordTime / 10).toString();
    if (!timeStr.includes('.')) {
      timeStr += '.0';
    }
    document.querySelector('.record .recording-status').innerHTML = 'Recording... (<span>' + timeStr + '</span>&nbsp;s)';

    if (recordTime >= 150) {
      clearInterval(updateRecordTimeInterval);
      window.updateRecordTimeInterval = undefined;

      document.querySelector('.record').classList.remove('recording');
      document.querySelector('.record').removeAttribute('disabled');

      if (hasVerifyData) {
        outputEditor2.setValue('// Loading API Response...');
      } else {
        outputEditor1.setValue('// Loading API Response...');
      }

      await stopRecording((resp) => {
        if (hasVerifyData) {
          outputEditor2.setValue(JSON.stringify(resp, null, '\t'));
        } else {
          outputEditor1.setValue(JSON.stringify(resp, null, '\t'));
        }
      }, verifyData);
    }
  };
  updateRecordTimeInterval = setInterval(update, 100);
  update();
};
