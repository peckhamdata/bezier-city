test('displays the game window', () => {
	expect(queryByTestId('game-window')).toBeInstanceOf(HTMLElement);
});