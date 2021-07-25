// console.log("Test");
const flashMessage = (message, status) => {
    msg = document.getElementById("addedToCartMsg");
    msg.style.visibility = "visible";
    msg.innerHTML = message;
    if(status === "success") {
        msg.classList.add("addedToCartSuccess");
    } else {
        msg.classList.add("addedToCartError");
    }

    setTimeout(() => {
        document.getElementById("addedToCartMsg").style.visibility = "hidden";
        msg.innerHTML = "";
    },3000);
}

const addToCart = btn => {
    const csrfToken = btn.parentNode.querySelector("[name=_csrf]").value;
    const productId = btn.parentNode.querySelector("[name=productId]").value;
    
    fetch("/cart/" + productId, {
        method: "POST",
        headers: {
            "csrf-token": csrfToken
        }
    })
    .then(result => {
        return result.json();
    })
    .then(data => {
        console.log(data);
        flashMessage("Added to Cart Successfully.", "success");
    })
    .catch(err => {
        console.log(err);
        flashMessage("Failed to add to cart.", "fail");
    })
}