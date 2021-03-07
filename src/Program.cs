using System;
using System.IO;
using CommandLine;

namespace Converter
{
    public partial class Program
    {
        /// <summary>
        /// Gets or sets the template for the game configs
        /// </summary>
        public static string TemplateGameConfig { get; set; }

        /// <summary>
        /// Gets or sets the template for the game configs
        /// </summary>
        public static string TemplateOverlayConfig { get; set; }

        /// <summary>
        /// Main application entry point
        /// </summary>
        /// <param name="args">The command line arguments</param>
        static void Main(string[] args)
        {
            Parser.Default.ParseArguments<Options>(args)
                   .WithParsed<Options>(Init);
        }

        /// <summary>
        /// Initializes the import
        /// </summary>
        /// <param name="options">The options</param>
        static void Init(Options options)
        {
            // check that input folder exists
            if (!Directory.Exists(options.Source)) { throw new DirectoryNotFoundException($"Unable to find directory {options.Source}"); }

            // create folders
            if (!Directory.Exists(options.OutputRoms)) { Directory.CreateDirectory(options.OutputRoms); }
            if (!Directory.Exists(options.OutputOverlays)) { Directory.CreateDirectory(options.OutputOverlays); }
            if (!string.IsNullOrEmpty(options.OutputDebug) && !Directory.Exists(options.OutputDebug)) { Directory.CreateDirectory(options.OutputDebug); }

            // load templates
            if (!File.Exists(options.TemplateGameCfg)) { throw new FileNotFoundException("Unable to find game config template", options.TemplateGameCfg); }
            if (!File.Exists(options.TemplateOverlayCfg)) { throw new FileNotFoundException("Unable to find overlay config template", options.TemplateOverlayCfg); }
            TemplateGameConfig = File.ReadAllText(options.TemplateGameCfg);
            TemplateOverlayConfig = File.ReadAllText(options.TemplateOverlayCfg);

            var importer = new Importer(options);
            importer.Start();
        }
    }
}
