const cacheData = (url, data, expiryInMillis = 1000) => {
    try {
        const expiryTimestamp = Date.now() + expiryInMillis;

        const cacheObject = {
            data,
            expiry: expiryTimestamp
        };

        const key = location.hostname + "|" + url;

        localStorage.setItem(key, JSON.stringify(cacheObject));

        return data;
    } catch (e) {
        return data;
    }
};

const cachedData = (url) => {
    try {
        const key = location.hostname + "|" + url;

        const cacheString = localStorage.getItem(key);

        if (!cacheString) return null;

        const {data, expiry} = JSON.parse(cacheString);

        if (Date.now() > expiry) {
            localStorage.removeItem(url);
            return null;
        }

        return {data, expiry};
    } catch (e) {
        return null;
    }
};

const fetcher = ({url, onData}) => {
    const data = cachedData(url);
    if (!data) {
        $.ajax({
            url,
            type: "GET",
            dataType: 'json',
            success: function (data) {
                cacheData(url, data, 100);
                onData(data);
            }
        });
    } else {
        onData(data);
    }
};

const formatPrice = (price) => {
    return new Intl.NumberFormat('tr-TR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(price);
};

const buildProductListItem = (data) => {
    const buildHtml = ({id, brand, name, url, img, price, original_price, rating, rating_count}) => {

        const priceNow = `
            <span class="price-now${original_price > price ? " discounted" : ""}">${formatPrice(price)} TL</span>
        `;

        const discountPercentage = Math.floor(((original_price - price) / original_price) * 100);
        const discount = original_price > price ? `
            <div class="discount">
                <span class="price-old discounted">${formatPrice(original_price)} TL</span>
                <span class="percentage discounted">%${discountPercentage}<i class='bx bxs-down-arrow-circle'></i></span>
            </div>
        ` : '';

        let ratingItems = "";
        for (let i = 0; i < 5; i++) {
            const filled = Math.ceil(rating ?? 0) >= i + 1;
            ratingItems += `<li><i class='bx bxs-star${filled ? " filled" : ""}'></i></li>`;
        }

        return `
            <li class="product-list__item"
                data-id="${id}">
                <a href="${url}" target="_blank">
                    <div class="product-card">
                        <div class="product-card__header">
                            <img src="${img}" alt="product-image">
                        </div>
                        <div class="product-card__title">
                            <h2 class="title"><b>${brand} -</b> ${name}</h2>
                        </div>
                        <div class="product-card__rating">
                            <ul class="rating-bar">
                                ${ratingItems}
                            </ul>
                            <span class="rating-count">(${rating_count ?? 0})</span>
                        </div>
                        <div class="product-card__pricing">
                            ${discount}
                            ${priceNow}
                        </div>
                        <div class="product-card__promotion">
                        </div>
                        <div class="product-card__footer">
                            <button class="btn-cart">Sepete Ekle</button>
                        </div>
                    </div>
                </a>
            </li>
        `
    };

    return buildHtml(data);
};

$(function () {
    fetcher({
        url: "https://gist.githubusercontent.com/sevindi/8bcbde9f02c1d4abe112809c974e1f49/raw/9bf93b58df623a9b16f1db721cd0a7a539296cf0/products.json",
        onData: (products) => {
            for (const product of products) {
                const productListItem = buildProductListItem(product);
                $(this).find("ul.product-list").append(productListItem);
            }
        },
    });

    const $slider = $('.product-list');
    let isDown = false;
    let startX;
    let scrollLeft;

    $slider.on('mousedown', function (e) {
        isDown = true;
        $slider.addClass('dragging');
        startX = e.pageX - $slider.offset().left;
        scrollLeft = $slider.scrollLeft();
        e.preventDefault();
    });

    $(document).on('mouseup', function () {
        isDown = false;
        $slider.removeClass('dragging');
    });

    $(document).on('mousemove', function (e) {
        if (!isDown) return;
        const x = e.pageX - $slider.offset().left;
        const walk = (x - startX) * 1.5; // adjust scroll speed
        $slider.scrollLeft(scrollLeft - walk);
    });

    $(".product-list").on("click", (e) => {
        if ($(e.target).hasClass("btn-cart")) {
            e.preventDefault();
        }
    });
});