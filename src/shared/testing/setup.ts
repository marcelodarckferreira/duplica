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
