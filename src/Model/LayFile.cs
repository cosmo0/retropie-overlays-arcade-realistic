using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Xml.Serialization;

namespace Converter.Model
{
    /// <summary>
    /// A MAME .lay file
    /// </summary>
    [XmlRoot("mamelayout")]
    public class LayFile
    {
        /// <summary>
        /// Gets or sets the displayable elements
        /// </summary>
        [XmlElement("element")]
        public Element[] Elements { get; set; }

        /// <summary>
        /// Gets or sets the configurable views
        /// </summary>
        [XmlElement("view")]
        public View[] Views { get; set; }

        /// <summary>
        /// An element to display
        /// </summary>
        [DebuggerDisplay("{Name}")]
        public class Element
        {
            /// <summary>
            /// Gets or sets the element name
            /// </summary>
            [XmlAttribute("name")]
            public string Name { get; set; }

            /// <summary>
            /// Gets or sets the images
            /// </summary>
            [XmlElement("image")]
            public Image[] Images { get; set; }

            /// <summary>
            /// An image element
            /// </summary>
            [DebuggerDisplay("{File}")]
            public class Image
            {
                /// <summary>
                /// Gets or sets the file name
                /// </summary>
                [XmlAttribute("file")]
                public string File { get; set; }
            }
        }

        /// <summary>
        /// A configurable view
        /// </summary>
        [DebuggerDisplay("{Name}")]
        public class View
        {
            /// <summary>
            /// Gets or sets the view name
            /// </summary>
            [XmlAttribute("name")]
            public string Name { get; set; }

            /// <summary>
            /// Gets or sets the screens
            /// </summary>
            [XmlElement("screen")]
            public ViewElement[] Screens { get; set; }

            /// <summary>
            /// Gets or sets the overlays (masks)
            /// </summary>
            [XmlElement("overlay")]
            public ViewElement[] Overlays { get; set; }

            /// <summary>
            /// Gets or sets the backdrops
            /// </summary>
            [XmlElement("backdrop")]
            public ViewElement[]Backdrops { get; set; }

            /// <summary>
            /// Gets or sets the bezel (background decorations)
            /// </summary>
            [XmlElement("bezel")]
            public ViewElement[] Bezels { get; set; }

            /// <summary>
            /// A view element (overlay, backdrop, bezel...)
            /// </summary>
            public class ViewElement
            {
                /// <summary>
                /// Gets or sets the name of the referenced element
                /// </summary>
                [XmlAttribute("element")]
                public string ElementName { get; set; }

                /// <summary>
                /// Gets or sets the bounds
                /// </summary>
                [XmlElement("bounds")]
                public Bounds Bounds { get; set; }

            }

            /// <summary>
            /// A view screen
            /// </summary>
            public class Screen
            {
                /// <summary>
                /// Gets or sets the screen index
                /// </summary>
                [XmlAttribute("index")]
                public int Index { get; set; }

                /// <summary>
                /// Gets or sets the bounds
                /// </summary>
                [XmlElement("bounds")]
                public Bounds Bounds { get; set; }
            }

            /// <summary>
            /// An element bounds (position)
            /// </summary>
            public class Bounds
            {
                [XmlAttribute("x")]
                public int X { get; set; }

                [XmlAttribute("y")]
                public int Y { get; set; }

                [XmlAttribute("width")]
                public int Width { get; set; }

                [XmlAttribute("height")]
                public int Height { get; set; }
            }
        }
    }
}
