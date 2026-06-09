const EN_LAYOUT = "qwertyuiop[]asdfghjkl;'zxcvbnm,./QWERTYUIOP{}ASDFGHJKL:\"ZXCVBNM<>?";
const RU_LAYOUT = "йцукенгшщзхъфывапролджэячсмитьбю.ЙЦУКЕНГШЩЗХЪФЫВАПРОЛДЖЭЯЧСМИТЬБЮ,";


export function switchLayout(text) {
    let result = '';

    for (let char of text) {
        const enIdx = EN_LAYOUT.indexOf(char);
        const ruIdx = RU_LAYOUT.indexOf(char);

        if (enIdx !== -1) {
            result += RU_LAYOUT[enIdx]; 
        } else if (ruIdx !== -1) {
            result += EN_LAYOUT[ruIdx]; 
        } else {
            result += char;
        }
    }
    
    return result;
}