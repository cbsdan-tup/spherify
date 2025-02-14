import Quill from 'quill';

// Define custom fonts, including Google Fonts
const Font = Quill.import('formats/font');
Font.whitelist = ['arial', 'comic-sans', 'courier-new', 'georgia', 'impact', 'times-new-roman', 'verdana',
  'poppins', 'roboto', 'lobster', 'merriweather', 'montserrat', 'nunito', 'oswald', 
  'pacifico', 'playfair-display', 'roboto-mono', 'roboto-serif', 'spectral', 'trebuchet-ms'];
Quill.register(Font, true);

// Export font list correctly
export const FONT_OPTIONS = ['arial', 'comic-sans', 'courier-new', 'georgia', 'impact', 'times-new-roman', 'verdana',
  'poppins', 'roboto', 'lobster', 'merriweather', 'montserrat', 'nunito', 'oswald', 
  'pacifico', 'playfair-display', 'roboto-mono', 'roboto-serif', 'spectral', 'trebuchet-ms'];
