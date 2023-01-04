

const prettyAmount = (amount) => {
    // 1000 => 1 000
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
