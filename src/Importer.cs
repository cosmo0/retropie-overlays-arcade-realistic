using System;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Xml.Serialization;

namespace Converter
{
    public class Importer
    {
        private readonly Options options;

        /// <summary>
        /// Initializes a new Importer instance
        /// </summary>
        /// <param name="options">The import options</param>
        public Importer(Options options)
        {
            this.options = options;
        }

        /// <summary>
        /// Starts the import
        /// </summary>
        public void Start()
        {
            var tmp = Path.Join(options.OutputOverlays, "tmp");
            if (!Directory.Exists(tmp)) {
                Directory.CreateDirectory(tmp);
            } else {
                CleanupFolder(tmp);
            }

            // get all zip files in the source folder
            foreach (var f in Directory.EnumerateFiles(options.Source, "*.zip").OrderBy(ff => ff))
            {
                var fi = new FileInfo(f);
                var game = fi.Name.Replace(".zip", "");
                var cfgFile = Path.Join(options.Source, $"{game}.cfg");

                Console.WriteLine($"########## PROCESSING {game}");

                // extract files
                using (ZipArchive archive = ZipFile.OpenRead(f))
                {
                    archive.ExtractToDirectory(tmp);
                }

                // parse the layout file
                Model.LayFile lay = ParseXmlFile<Model.LayFile>(Path.Join(tmp, "default.lay"));

                // parse the config file if it exists
                Model.CfgFile cfg = null;
                if (File.Exists(cfgFile))
                {
                    cfg = ParseXmlFile<Model.CfgFile>(cfgFile);
                }

                // calculates the screen position

                // resize the bezel image

                // debug: draw target position

                // create config files

                CleanupFolder(tmp);
            }

            Directory.Delete(tmp, true);

            Console.WriteLine($"########## DONE");
        }

        private static void CleanupFolder(string folder)
        {
            DirectoryInfo di = new DirectoryInfo(folder);

            foreach (FileInfo file in di.GetFiles())
            {
                file.Delete();
            }

            foreach (DirectoryInfo dir in di.GetDirectories())
            {
                dir.Delete(true);
            }
        }

        private static T ParseXmlFile<T>(string filePath)
        {
            using (var fileStream = File.Open(filePath, FileMode.Open))
            {
                XmlSerializer serializer = new XmlSerializer(typeof(T));
                return (T)serializer.Deserialize(fileStream);
            }
        }
    }
}
