export interface DefaultImage {
    id: string;
    url: string;
    category: 'kittens' | 'ocean' | 'landscapes';
    title: string;
}

export const defaultImages: DefaultImage[] = [
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

    // Ocean - Local images
    {
        id: 'ocean-1',
        url: 'assets/images/ocean/ocean-1.jpg',
        category: 'ocean',
        title: 'Marine Life'
    },
    {
        id: 'ocean-2',
        url: 'assets/images/ocean/ocean-2.jpg',
        category: 'ocean',
        title: 'Ocean Scene'
    },
    {
        id: 'ocean-3',
        url: 'assets/images/ocean/ocean-3.jpg',
        category: 'ocean',
        title: 'Sea Life'
    },
    {
        id: 'ocean-4',
        url: 'assets/images/ocean/ocean-4.jpg',
        category: 'ocean',
        title: 'Ocean Waves'
    },
    {
        id: 'ocean-5',
        url: 'assets/images/ocean/ocean-5.jpg',
        category: 'ocean',
        title: 'Ocean Sunset'
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

export const getImagesByCategory = (category: 'kittens' | 'ocean' | 'landscapes'): DefaultImage[] => {
    return defaultImages.filter(image => image.category === category);
};
