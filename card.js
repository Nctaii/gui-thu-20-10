(() => {
  'use strict';

  const defaultGreeting = {
    recipient: 'em Thư',
    message: '20/10 vui vẻ nhé Thư! Tặng em một bó hoa nhỏ, mong em thích.\n\nChúc em luôn khỏe, bớt lo nghĩ và có nhiều thời gian làm những điều em thích. Hôm nay nhớ ăn món ngon, nghỉ ngơi một chút và tự thưởng cho mình gì đó nhé.\n\nMong hôm nay và những ngày sau em đều vui.',
    sender: 'Anh'
  };
  const dialog = document.getElementById('greetingCard');
  const openButton = document.getElementById('openCard');
  const reading = document.getElementById('cardReading');
  const editor = document.getElementById('cardEditor');
  const editButton = document.getElementById('editCard');
  const status = document.getElementById('cardStatus');
  const closeButton = document.getElementById('closeCard');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const desktopLayout = window.matchMedia('(min-width: 1100px)');
  const sceneElements = [...document.querySelectorAll('.bouquet-composition, .scene-footer')];
  const layoutAnimations = new Set();
  function reflowScene(changeLayout) {
    layoutAnimations.forEach(animation => animation.cancel());
    layoutAnimations.clear();
    const before = sceneElements.map(element => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left + window.scrollX, top: rect.top + window.scrollY, width: rect.width, height: rect.height };
    });
    changeLayout();
    if (motion.matches) return;
    sceneElements.forEach((element, index) => {
      const after = element.getBoundingClientRect();
      if (!after.width || !after.height) return;
      const dx = before[index].left - after.left - window.scrollX;
      const dy = before[index].top - after.top - window.scrollY;
      const scale = element.matches('.bouquet-composition')
        ? ` scale(${before[index].width / after.width}, ${before[index].height / after.height})` : '';
      const animation = element.animate([
        { transform: `translate(${dx}px, ${dy}px)${scale}` },
        { transform: 'none' }
      ], { duration: 600, easing: 'cubic-bezier(.2,.8,.2,1)' });
      layoutAnimations.add(animation);
      animation.onfinish = () => layoutAnimations.delete(animation);
    });
  }

  function revealCard() {
    const rect = dialog.getBoundingClientRect();
    if (!desktopLayout.matches || rect.top < 16 || rect.top > window.innerHeight * 0.35 || rect.bottom > window.innerHeight - 16) {
      dialog.scrollIntoView({ behavior: motion.matches ? 'instant' : 'smooth', block: 'start' });
    }
  }

  function setCardOpen(open) {
    if (dialog.open === open) return;
    reflowScene(() => {
      if (open) {
        showReading();
        status.textContent = '';
        // A non-modal dialog participates in the page grid and reserves its own space.
        document.body.classList.add('card-open');
        dialog.show();
      } else {
        dialog.close();
        document.body.classList.remove('card-open');
        showReading();
      }
      openButton.setAttribute('aria-expanded', String(open));
      openButton.querySelector('.envelope-action').textContent = open ? 'Gấp thiệp' : 'Mở thiệp';
    });
    if (open) {
      closeButton.focus({ preventScroll: true });
      revealCard();
      document.dispatchEvent(new Event('bouquet:celebrate'));
    } else {
      openButton.focus({ preventScroll: true });
      const rect = openButton.getBoundingClientRect();
      if (rect.top < 0 || rect.bottom > window.innerHeight) {
        openButton.scrollIntoView({ behavior: motion.matches ? 'instant' : 'smooth', block: 'center' });
      }
    }
  }

  motion.addEventListener('change', () => {
    if (motion.matches) {
      layoutAnimations.forEach(animation => animation.cancel());
      layoutAnimations.clear();
    }
  });
  const inputs = {
    recipient: document.getElementById('recipientInput'),
    message: document.getElementById('messageInput'),
    sender: document.getElementById('senderInput')
  };
  let greeting = { ...defaultGreeting };

  try {
    const saved = GreetingLink.decode(location.hash);
    if (saved && Object.keys(inputs).every(key => typeof saved[key] === 'string'
      && saved[key].trim().length > 0 && saved[key].length <= inputs[key].maxLength)) {
      greeting = Object.fromEntries(Object.keys(inputs).map(key => [key, saved[key].trim()]));
    }
  } catch {
    status.textContent = 'Liên kết này chưa đúng định dạng. Bạn đang xem lời chúc mặc định.';
  }

  function renderGreeting() {
    document.getElementById('cardRecipient').textContent = greeting.recipient;
    const paragraphs = greeting.message.split(/\n\s*\n/).map(text => {
      const paragraph = document.createElement('span');
      paragraph.className = 'message-paragraph';
      paragraph.textContent = text;
      return paragraph;
    });
    document.getElementById('cardMessage').replaceChildren(...paragraphs);
    document.getElementById('cardSender').textContent = greeting.sender;
  }

  function showReading() {
    reading.hidden = false;
    editor.hidden = true;
    dialog.setAttribute('aria-labelledby', 'cardTitle');
    dialog.scrollTop = 0;
  }

  document.addEventListener('bouquet:ready', () => { openButton.hidden = false; });
  document.addEventListener('bouquet:rose', event => {
    const wish = document.getElementById('roseWish');
    wish.classList.remove('is-new');
    wish.textContent = event.detail.message;
    // Restart the brief reveal even when two flowers share the same wish.
    void wish.offsetWidth;
    wish.classList.add('is-new');
  });
  document.getElementById('replayBloom').addEventListener('click', () => {
    document.dispatchEvent(new Event('bouquet:replay'));
    document.getElementById('roseWish').textContent = '';
  });

  openButton.addEventListener('click', () => setCardOpen(!dialog.open));
  closeButton.addEventListener('click', () => setCardOpen(false));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && dialog.open && !event.defaultPrevented) {
      event.preventDefault();
      setCardOpen(false);
    }
  });
  dialog.addEventListener('close', () => {
    if (dialog.open || !document.body.classList.contains('card-open')) return;
    document.body.classList.remove('card-open');
    openButton.setAttribute('aria-expanded', 'false');
    openButton.querySelector('.envelope-action').textContent = 'Mở thiệp';
    showReading();
  });

  editButton.addEventListener('click', () => {
    Object.keys(inputs).forEach(key => {
      inputs[key].value = greeting[key];
      inputs[key].setCustomValidity('');
    });
    reading.hidden = true;
    editor.hidden = false;
    status.textContent = '';
    dialog.setAttribute('aria-labelledby', 'editorTitle');
    dialog.scrollTop = 0;
    inputs.recipient.focus({ preventScroll: true });
    revealCard();
  });
  document.getElementById('cancelEdit').addEventListener('click', () => {
    showReading();
    editButton.focus({ preventScroll: true });
    revealCard();
  });
  Object.values(inputs).forEach(input => {
    input.addEventListener('input', () => input.setCustomValidity(''));
  });
  editor.addEventListener('submit', event => {
    event.preventDefault();
    for (const input of Object.values(inputs)) {
      input.setCustomValidity(input.value.trim() ? '' : 'Bạn viết vài chữ vào đây nhé.');
    }
    if (!editor.reportValidity()) return;
    greeting = Object.fromEntries(Object.entries(inputs).map(([key, input]) => [key, input.value.trim()]));
    renderGreeting();
    showReading();
    try {
      history.replaceState(null, '', GreetingLink.url(location.href, greeting));
      status.textContent = 'Đã cập nhật. Bấm “Sao chép liên kết” để gửi lời chúc này.';
    } catch {
      status.textContent = 'Đã cập nhật thiệp. Bấm “Sao chép liên kết” để giữ lời chúc.';
    }
    editButton.focus({ preventScroll: true });
    revealCard();
  });
  document.getElementById('shareCard').addEventListener('click', async () => {
    const url = GreetingLink.url(location.href, greeting);
    const output = document.getElementById('shareLink');
    output.value = url;
    document.getElementById('shareResult').hidden = false;
    const local = location.protocol === 'file:' || ['localhost', '127.0.0.1', '::1', '[::1]'].includes(location.hostname);
    document.getElementById('shareHint').textContent = local
      ? 'Đây là bản chạy trên máy bạn. Cần đưa trang lên Internet trước khi gửi liên kết cho người khác.'
      : 'Gửi liên kết này cho người nhận. Lời chúc đã nằm trong liên kết.';
    try {
      await navigator.clipboard.writeText(url);
      status.textContent = local ? 'Đã sao chép liên kết bản chạy thử.' : 'Đã sao chép. Bạn gửi liên kết này là được nhé.';
    } catch {
      output.focus();
      output.select();
      status.textContent = 'Bạn sao chép liên kết trong ô bên dưới nhé.';
    }
  });
  renderGreeting();
})();
