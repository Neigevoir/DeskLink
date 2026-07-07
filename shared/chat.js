/**
 * ChatUI — self-contained chat DOM component.
 *
 * Creates a message list + input field inside a given container element.
 * Communicates with the app layer via callbacks — zero WebRTC knowledge.
 *
 * @module shared/chat
 */

export class ChatUI {
  /** @type {HTMLElement} */
  #container;
  /** @type {string} */
  #senderName;
  /** @type {(text: string) => void} */
  #onSend;
  /** @type {HTMLElement} */
  #messagesEl;
  /** @type {HTMLInputElement} */
  #inputEl;
  /** @type {HTMLButtonElement} */
  #sendBtn;

  /**
   * @param {object} opts
   * @param {HTMLElement} opts.container — DOM element to populate
   * @param {string} opts.senderName — displayed as the sender for outgoing messages
   * @param {(text: string) => void} opts.onSend — called when user hits Send
   */
  constructor({ container, senderName, onSend }) {
    this.#container = container;
    this.#senderName = senderName;
    this.#onSend = onSend;
    this.#build();
  }

  /**
   * Append a received message to the chat log.
   * @param {object} msg
   * @param {string} msg.sender
   * @param {string} msg.text
   * @param {boolean} [isSelf] — true if this message originated locally
   */
  addMessage(msg, isSelf = false) {
    const div = document.createElement('div');
    div.className = 'chat-msg';
    div.innerHTML = `<span class="chat-sender${isSelf ? ' self' : ''}">${msg.sender}:</span> ${msg.text}`;
    this.#messagesEl.appendChild(div);
    div.scrollIntoView({ behavior: 'smooth' });
  }

  /** Clear all messages and the input field. */
  clear() {
    this.#messagesEl.innerHTML = '';
    this.#inputEl.value = '';
  }

  /** Remove all DOM elements created by this component. */
  destroy() {
    this.#container.innerHTML = '';
  }

  // ---- Private ----

  #build() {
    this.#container.innerHTML = '';

    this.#messagesEl = document.createElement('div');
    this.#messagesEl.className = 'chat-messages';
    this.#container.appendChild(this.#messagesEl);

    const row = document.createElement('div');
    row.className = 'chat-input-row';

    this.#inputEl = document.createElement('input');
    this.#inputEl.type = 'text';
    this.#inputEl.placeholder = 'Type a message...';
    this.#inputEl.onkeydown = (e) => {
      if (e.key === 'Enter') this.#send();
    };
    row.appendChild(this.#inputEl);

    this.#sendBtn = document.createElement('button');
    this.#sendBtn.textContent = 'Send';
    this.#sendBtn.onclick = () => this.#send();
    row.appendChild(this.#sendBtn);

    this.#container.appendChild(row);
  }

  #send() {
    const text = this.#inputEl.value.trim();
    if (!text) return;
    this.#onSend(text);
    this.#inputEl.value = '';
  }
}
