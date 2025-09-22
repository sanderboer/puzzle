export const defaultImages = [
    // Kittens - Local images
    {
        id: 'kitten-1',
        url: 'assets/images/kittens/kitten-1.jpg',
        category: 'kittens',
        title: 'Orange Kitten'
    },
    {
        id: 'kitten-2',
        url: 'assets/images/kittens/kitten-2.jpg',
        category: 'kittens',
        title: 'Gray Tabby'
    },
    {
        id: 'kitten-3',
        url: 'assets/images/kittens/kitten-3.jpg',
        category: 'kittens',
        title: 'Calico Kitten'
    },
    {
        id: 'kitten-4',
        url: 'assets/images/kittens/kitten-4.jpg',
        category: 'kittens',
        title: 'White Fluffy'
    },
    {
        id: 'kitten-5',
        url: 'assets/images/kittens/kitten-5.jpg',
        category: 'kittens',
        title: 'Black Kitten'
    },
    // Baby Seals - Local images
    {
        id: 'seal-1',
        url: 'assets/images/seals/seal-1.jpg',
        category: 'seals',
        title: 'Harbor Seal Pup'
    },
    {
        id: 'seal-2',
        url: 'assets/images/seals/seal-2.jpg',
        category: 'seals',
        title: 'Gray Seal'
    },
    {
        id: 'seal-3',
        url: 'assets/images/seals/seal-3.jpg',
        category: 'seals',
        title: 'Spotted Seal'
    },
    {
        id: 'seal-4',
        url: 'assets/images/seals/seal-4.jpg',
        category: 'seals',
        title: 'Seal on Rock'
    },
    {
        id: 'seal-5',
        url: 'assets/images/seals/seal-5.jpg',
        category: 'seals',
        title: 'Baby Seal'
    },
    // Landscapes - Local images
    {
        id: 'landscape-1',
        url: 'assets/images/landscapes/landscape-1.jpg',
        category: 'landscapes',
        title: 'Mountain Lake'
    },
    {
        id: 'landscape-2',
        url: 'assets/images/landscapes/landscape-2.jpg',
        category: 'landscapes',
        title: 'Forest Path'
    },
    {
        id: 'landscape-3',
        url: 'assets/images/landscapes/landscape-3.jpg',
        category: 'landscapes',
        title: 'Ocean Sunset'
    },
    {
        id: 'landscape-4',
        url: 'assets/images/landscapes/landscape-4.jpg',
        category: 'landscapes',
        title: 'Desert Dunes'
    },
    {
        id: 'landscape-5',
        url: 'assets/images/landscapes/landscape-5.jpg',
        category: 'landscapes',
        title: 'Alpine Valley'
    }
];
export const getImagesByCategory = (category) => {
    return defaultImages.filter(image => image.category === category);
};
//# sourceMappingURL=defaultImages.js.map