import { useEffect } from "react";

const UseFavicon = (url) => {
  useEffect(() => {
    const link = document.querySelector("link[rel~='icon']");
    if (!link) {
      const newLink = document.createElement("link");
      newLink.rel = "icon";
      document.head.appendChild(newLink);
    }
    link.href = url;
  }, [url]);
};

export default UseFavicon;
