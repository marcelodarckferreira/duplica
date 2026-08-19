// jsdom não implementa ResizeObserver; Radix Select/Popper usam-no para medir
// o trigger antes de posicionar o conteúdo — sem o stub, o componente nunca
// monta em ambiente de teste.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.defineProperty(window, "ResizeObserver", {
  value: ResizeObserverStub,
  configurable: true,
});

// jsdom também não implementa a Pointer Capture API nem scrollIntoView; o
// Radix Select as usa ao abrir/selecionar item via ponteiro (clique real do
// user-event), sem os stubs a interação lança "not a function" em teste.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {};
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {};
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

const store = new Map<string, string>();

Object.defineProperty(window, "localStorage", {
  value: {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
  },
  configurable: true,
});
