function calculateSimpleRevenue(purchase, _product) {
    const { discount, sale_price, quantity } = purchase;

    const discountCoefficient = 1 - discount / 100;

    return sale_price * quantity * discountCoefficient;
}

function calculateBonusByProfit(index, total, seller) {
    const { profit } = seller;

    let bonusRate;

    if (index === 0) {
        bonusRate = 0.15;
    } else if (index === 1 || index === 2) {
        bonusRate = 0.10;
    } else if (index === total - 1) {
        bonusRate = 0;
    } else {
        bonusRate = 0.05;
    }

    return profit * bonusRate;
}

function analyzeSalesData(data, options) {
    if (
        !data ||
        !Array.isArray(data.sellers) ||
        data.sellers.length === 0 ||
        !Array.isArray(data.products) ||
        data.products.length === 0 ||
        !Array.isArray(data.purchase_records) ||
        data.purchase_records.length === 0
    ) {
        throw new Error('Некорректные входные данные');
    }

    if (!options || typeof options !== 'object') {
        throw new Error('Некорректные настройки');
    }

    const { calculateRevenue, calculateBonus } = options;

    if (
        typeof calculateRevenue !== 'function' ||
        typeof calculateBonus !== 'function'
    ) {
        throw new Error('Не переданы функции расчёта');
    }

    const sellerStats = data.sellers.map(seller => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {},
        bonus: 0,
        top_products: []
    }));

    const sellerIndex = Object.fromEntries(
        sellerStats.map(seller => [seller.id, seller])
    );

    const productIndex = Object.fromEntries(
        data.products.map(product => [product.sku, product])
    );

    data.purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];

        if (!seller) {
            throw new Error(
                `Продавец ${record.seller_id} не найден`
            );
        }

        seller.sales_count += 1;
        seller.revenue += record.total_amount;

        record.items.forEach(item => {
            const product = productIndex[item.sku];

            if (!product) {
                throw new Error(`Товар ${item.sku} не найден`);
            }

            const cost = product.purchase_price * item.quantity;

            const revenue = calculateRevenue(item, product);

            const profit = revenue - cost;

            seller.profit += profit;

            if (seller.products_sold[item.sku] === undefined) {
                seller.products_sold[item.sku] = 0;
            }

            seller.products_sold[item.sku] += item.quantity;
        });
    });

    sellerStats.sort((a, b) => b.profit - a.profit);

    sellerStats.forEach((seller, index) => {
        seller.bonus = calculateBonus(
            index,
            sellerStats.length,
            seller
        );

        seller.top_products = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({
                sku,
                quantity
            }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
    });

    return sellerStats.map(seller => ({
        seller_id: seller.id,
        name: seller.name,
        revenue: +seller.revenue.toFixed(2),
        profit: +seller.profit.toFixed(2),
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: +seller.bonus.toFixed(2)
    }));
}