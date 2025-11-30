import { useEffect } from 'react';

interface ScrollOptions {
    behavior?: ScrollBehavior;
    offset?: number;
}

export function useSmoothScroll(options: ScrollOptions = {}) {
    const { behavior = 'smooth', offset = 0 } = options;

    useEffect(() => {
        // Smooth scroll for anchor links
        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const anchor = target.closest('a[href^="#"]');

            if (anchor) {
                const href = anchor.getAttribute('href');
                if (href && href.startsWith('#')) {
                    e.preventDefault();
                    const element = document.querySelector(href);
                    if (element) {
                        const top = element.getBoundingClientRect().top + window.pageYOffset - offset;
                        window.scrollTo({
                            top,
                            behavior,
                        });
                    }
                }
            }
        };

        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, [behavior, offset]);
}

export function scrollToElement(
    element: HTMLElement | string,
    options: ScrollOptions = {}
) {
    const { behavior = 'smooth', offset = 0 } = options;

    const targetElement =
        typeof element === 'string' ? document.querySelector(element) : element;

    if (targetElement) {
        const top =
            targetElement.getBoundingClientRect().top + window.pageYOffset - offset;
        window.scrollTo({
            top,
            behavior,
        });
    }
}

export function scrollToTop(options: ScrollOptions = {}) {
    const { behavior = 'smooth' } = options;
    window.scrollTo({
        top: 0,
        behavior,
    });
}
