/** jsdom has no layout, so give Recharts' containers the size they would have on the dashboard. */
export function giveChartsASize(width = 420, height = 200) {
  const size = { width, height, top: 0, left: 0, right: width, bottom: height, x: 0, y: 0, toJSON: () => ({}) }
  const original = HTMLElement.prototype.getBoundingClientRect
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    return this.classList.contains('recharts-responsive-container') ||
      this.parentElement?.classList.contains('recharts-responsive-container') ||
      this.classList.contains('recharts-wrapper')
      ? (size as DOMRect)
      : original.call(this)
  })
  for (const prop of ['clientWidth', 'offsetWidth'] as const)
    vi.spyOn(HTMLElement.prototype, prop, 'get').mockReturnValue(width)
  for (const prop of ['clientHeight', 'offsetHeight'] as const)
    vi.spyOn(HTMLElement.prototype, prop, 'get').mockReturnValue(height)
}
