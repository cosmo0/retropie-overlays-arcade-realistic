using System;
using System.Xml.Serialization;

namespace Converter.Model
{
    /// <summary>
    /// A MAME config file
    /// </summary>
    [XmlRoot("mameconfig")]
    public class CfgFile
    {
        /// <summary>
        /// Gets or sets the configured system
        /// </summary>
        [XmlElement("system")]
        public System SystemConfig { get; set; }

        /// <summary>
        /// A configured system
        /// </summary>
        public class System
        {
            /// <summary>
            /// Gets or sets the system name (ex: altbeast)
            /// </summary>
            [XmlAttribute("name")]
            public string Name { get; set; }

            /// <summary>
            /// Gets or sets the video configuration
            /// </summary>
            [XmlElement("video")]
            public Video VideoConfig { get; set; }

            /// <summary>
            /// The video configuration
            /// </summary>
            public class Video
            {
                /// <summary>
                /// Gets or sets the video target configuration
                /// </summary>
                [XmlElement("target")]
                public Target VideoTarget { get; set; }

                /// <summary>
                /// Gets or sets the video screen configuration
                /// </summary>
                [XmlElement("screen")]
                public Screen VideoScreen { get; set; }

                /// <summary>
                /// A target configuration
                /// </summary>
                public class Target
                {
                    /// <summary>
                    /// Gets or sets the configuration index
                    /// </summary>
                    [XmlAttribute("index")]
                    public int Index { get; set; }

                    /// <summary>
                    /// Gets or sets the configured view name
                    /// </summary>
                    [XmlAttribute("view")]
                    public string View { get; set; }
                }

                /// <summary>
                /// A screen configuration
                /// </summary>
                public class Screen
                {
                    /// <summary>
                    /// Gets or sets the screen index
                    /// </summary>
                    [XmlAttribute("index")]
                    public int Index { get; set; }

                    /// <summary>
                    /// Gets or sets the screen horizontal offset
                    /// </summary>
                    [XmlAttribute("hoffset")]
                    public double HOffset { get; set; }

                    /// <summary>
                    /// Gets or sets the screen horizontal stretch
                    /// </summary>
                    [XmlAttribute("hstretch")]
                    public double HStretch { get; set; }

                    /// <summary>
                    /// Gets or sets the screen vertical offset
                    /// </summary>
                    [XmlAttribute("voffset")]
                    public double VOffset { get; set; }

                    /// <summary>
                    /// Gets or sets the screen vertical stretch
                    /// </summary>
                    [XmlAttribute("vstretch")]
                    public double VStretch { get; set; }
                }
            }
        }
    }
}
