console.log("TESTING");
const deletePost = btn => {
    console.log(btn);
    const csrfToken = btn.parentNode.querySelector("[name=_csrf]").value;
    const productId = btn.parentNode.querySelector("[name=productId]").value;
    const productDiv = btn.parentNode.parentNode;
    productDiv.style.display = "none";

    fetch("/admin/product/" + productId, {
        method: "DELETE",
        headers: {
            "csrf-token": csrfToken
        }
    })
    .then(result => {
        return result.json();
    })
    .then(data => {
        console.log(data);
    })
    .catch(err => {
        console.log(err);
    })
}