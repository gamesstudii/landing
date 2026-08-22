package su.gamestudio.launcher;

import javax.swing.*;
import javax.swing.border.EmptyBorder;
import java.awt.*;
import java.awt.event.*;
import java.io.*;
import javax.imageio.ImageIO;
import java.net.URI;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.time.Duration;
import java.util.*;
import java.util.List;
import java.util.regex.*;
import java.util.zip.ZipInputStream;

public final class Launcher {
    private static final String APP_VERSION = "0.1.0";
    private static final String MANIFEST_URL = "https://gamestudio.su/launcher/manifest.json";
    private static final Path ROOT = Paths.get(System.getenv("LOCALAPPDATA"), "GamesStudioLauncher");
    private static final Path GAMES_DIR = ROOT.resolve("games");
    private static final Path STATE_FILE = ROOT.resolve("library.properties");
    private static final Color BG = Color.decode("#07111f"), PANEL = Color.decode("#0d1c2e"), TEXT = Color.decode("#f4f8ff"), MUTED = Color.decode("#92a4bc"), GOLD = Color.decode("#f7bd36");
    private final Properties installed = new Properties();
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(15)).build();
    private JLabel status = new JLabel("Проверяем каталог…"), version = new JLabel(APP_VERSION), updateDot = new JLabel("●");
    private JPanel gamesPanel = new JPanel(new GridLayout(0, 2, 16, 16));
    private JButton mainAction = new JButton("ПРОВЕРИТЬ ОБНОВЛЕНИЯ");
    private Manifest manifest;

    public static void main(String[] args) { SwingUtilities.invokeLater(() -> new Launcher().start()); }

    private void start() {
        try { Files.createDirectories(GAMES_DIR); if (Files.exists(STATE_FILE)) try (InputStream in = Files.newInputStream(STATE_FILE)) { installed.load(in); } }
        catch (IOException ignored) { }
        JFrame frame = new JFrame("Games Studio Launcher");
        frame.setDefaultCloseOperation(WindowConstants.EXIT_ON_CLOSE); frame.setMinimumSize(new Dimension(970, 650));
        try (InputStream icon = Launcher.class.getResourceAsStream("/assets/Games Studio.png")) { if (icon != null) frame.setIconImage(ImageIO.read(icon)); } catch (IOException ignored) { }
        frame.setSize(1220, 760); frame.setLocationRelativeTo(null); frame.setContentPane(createUi()); frame.setVisible(true); checkUpdates();
    }

    private JComponent createUi() {
        JPanel root = new JPanel(new BorderLayout()); root.setBackground(BG);
        JPanel sidebar = new JPanel(); sidebar.setBackground(Color.decode("#06101d")); sidebar.setBorder(new EmptyBorder(23, 10, 20, 10)); sidebar.setLayout(new BoxLayout(sidebar, BoxLayout.Y_AXIS)); sidebar.setPreferredSize(new Dimension(72, 0));
        JLabel logo = new JLabel("GS", SwingConstants.CENTER); logo.setOpaque(true); logo.setBackground(GOLD); logo.setForeground(Color.decode("#172232")); logo.setFont(new Font("Arial", Font.BOLD, 14)); logo.setMaximumSize(new Dimension(44, 44)); logo.setPreferredSize(new Dimension(44, 44)); logo.setAlignmentX(Component.CENTER_ALIGNMENT); sidebar.add(logo); sidebar.add(Box.createVerticalStrut(38));
        sidebar.add(nav("⌂", true, null)); sidebar.add(Box.createVerticalStrut(7)); sidebar.add(nav("⇩", false, this::checkUpdates)); sidebar.add(Box.createVerticalStrut(7)); sidebar.add(nav("⚙", false, () -> open(GAMES_DIR))); sidebar.add(Box.createVerticalGlue());
        version.setForeground(MUTED); version.setFont(new Font("Dialog", Font.PLAIN, 9)); version.setAlignmentX(Component.CENTER_ALIGNMENT); sidebar.add(version); root.add(sidebar, BorderLayout.WEST);
        JPanel content = new JPanel(); content.setBackground(BG); content.setBorder(new EmptyBorder(30, 42, 52, 42)); content.setLayout(new BoxLayout(content, BoxLayout.Y_AXIS));
        JPanel top = new JPanel(new BorderLayout()); top.setOpaque(false); JLabel title = label("УСТАНОВИТЬ ИГРЫ GAMES STUDIO", 27, TEXT); top.add(title, BorderLayout.WEST); mainAction.addActionListener(e -> checkUpdates()); styleButton(mainAction, false); top.add(mainAction, BorderLayout.EAST); content.add(top); content.add(Box.createVerticalStrut(25));
        content.add(hero()); content.add(Box.createVerticalStrut(42)); JLabel library = label("ИГРЫ GAMES STUDIO", 26, TEXT); content.add(library); content.add(Box.createVerticalStrut(5)); status.setForeground(MUTED); status.setFont(new Font("Dialog", Font.PLAIN, 12)); content.add(status); content.add(Box.createVerticalStrut(18)); gamesPanel.setBackground(BG); gamesPanel.setAlignmentX(Component.LEFT_ALIGNMENT); content.add(gamesPanel);
        JScrollPane scroll = new JScrollPane(content); scroll.setBorder(null); scroll.getViewport().setBackground(BG); scroll.getVerticalScrollBar().setUnitIncrement(16); root.add(scroll, BorderLayout.CENTER); return root;
    }

    private JComponent hero() {
        JPanel panel = new JPanel(new BorderLayout()); panel.setMaximumSize(new Dimension(Integer.MAX_VALUE, 282)); panel.setPreferredSize(new Dimension(0, 282)); panel.setBackground(Color.decode("#112943")); panel.setBorder(new EmptyBorder(38, 42, 38, 42));
        JPanel copy = new JPanel(); copy.setOpaque(false); copy.setLayout(new BoxLayout(copy, BoxLayout.Y_AXIS)); copy.add(small("В РАЗРАБОТКЕ")); copy.add(Box.createVerticalStrut(10)); copy.add(label("ASHES OF NATIONS", 42, TEXT)); copy.add(Box.createVerticalStrut(10)); JLabel desc = small("Стратегия о странах, сценариях и выборе пути государства."); desc.setForeground(Color.decode("#c3d0e1")); copy.add(desc); copy.add(Box.createVerticalGlue()); JButton b = new JButton("ОТКРЫТЬ КАТАЛОГ  →"); styleButton(b, true); b.addActionListener(e -> checkUpdates()); copy.add(b); panel.add(copy, BorderLayout.WEST); JLabel tag = small("GAMES STUDIO / 2026"); tag.setForeground(GOLD); panel.add(tag, BorderLayout.SOUTH); return panel;
    }

    private JButton nav(String text, boolean active, Runnable action) { JButton b = new JButton(text); b.setAlignmentX(Component.CENTER_ALIGNMENT); b.setMaximumSize(new Dimension(45, 43)); b.setPreferredSize(new Dimension(45, 43)); b.setHorizontalAlignment(SwingConstants.CENTER); b.setBorder(new EmptyBorder(10, 10, 10, 10)); b.setForeground(active ? GOLD : MUTED); b.setFont(new Font("Dialog", Font.BOLD, 18)); b.setBackground(active ? Color.decode("#172d45") : Color.decode("#06101d")); b.setBorderPainted(false); b.setFocusPainted(false); if (action != null) b.addActionListener(e -> action.run()); return b; }
    private JLabel label(String text, int size, Color color) { JLabel l = new JLabel(text); l.setForeground(color); l.setFont(new Font("Arial Narrow", Font.BOLD, size)); return l; }
    private JLabel small(String text) { JLabel l = new JLabel(text); l.setForeground(GOLD); l.setFont(new Font("Dialog", Font.BOLD, 10)); return l; }
    private void styleButton(JButton button, boolean gold) { button.setBackground(gold ? GOLD : Color.decode("#142941")); button.setForeground(gold ? Color.decode("#131a24") : TEXT); button.setBorder(BorderFactory.createEmptyBorder(12, 17, 12, 17)); button.setFocusPainted(false); button.setFont(new Font("Dialog", Font.BOLD, 11)); }

    private void checkUpdates() {
        mainAction.setEnabled(false); status.setText("Проверяем обновления…"); new SwingWorker<Manifest, Void>() {
            protected Manifest doInBackground() throws Exception { return Manifest.read(http, MANIFEST_URL); }
            protected void done() { try { manifest = get(); renderGames(); boolean newer = isNewer(manifest.launcherVersion, APP_VERSION); updateDot.setVisible(newer); status.setText(newer ? "Доступно обновление лаунчера" : "Все данные каталога актуальны"); if (newer && !manifest.launcherUrl.isBlank()) askLauncherUpdate(); } catch (Exception e) { status.setText("Не удалось проверить обновления. Проверьте интернет."); } finally { mainAction.setEnabled(true); } }
        }.execute();
    }

    private void renderGames() {
        gamesPanel.removeAll(); for (Game game : manifest.games) gamesPanel.add(gameCard(game)); gamesPanel.revalidate(); gamesPanel.repaint();
    }
    private JComponent gameCard(Game game) {
        JPanel card = new JPanel(new BorderLayout(0, 10)); card.setBackground(PANEL); card.setBorder(new EmptyBorder(20, 20, 18, 20)); card.setPreferredSize(new Dimension(300, 218));
        JLabel gameTitle = label(game.title.toUpperCase(), 20, TEXT); card.add(gameTitle, BorderLayout.NORTH);
        JTextArea description = new JTextArea(game.description); description.setForeground(MUTED); description.setBackground(PANEL); description.setFont(new Font("Dialog", Font.PLAIN, 12)); description.setLineWrap(true); description.setWrapStyleWord(true); description.setEditable(false); card.add(description, BorderLayout.CENTER);
        JPanel bottom = new JPanel(new BorderLayout()); bottom.setOpaque(false); String local = installed.getProperty(game.id + ".version", ""); JLabel v = new JLabel("VERSION " + (local.isBlank() ? "—" : local)); v.setForeground(MUTED); v.setFont(new Font("Dialog", Font.BOLD, 10)); bottom.add(v, BorderLayout.WEST);
        boolean ready = !game.url.isBlank(); boolean update = !local.isBlank() && isNewer(game.version, local); JButton action = new JButton(local.isBlank() ? "УСТАНОВИТЬ" : update ? "ОБНОВИТЬ" : "ИГРАТЬ"); action.setEnabled(ready); action.setToolTipText(ready ? "" : "Сборка для скачивания ещё не опубликована"); action.setForeground(GOLD); action.setBackground(PANEL); action.setBorderPainted(false); action.setFont(new Font("Dialog", Font.BOLD, 11)); action.addActionListener(e -> { if (local.isBlank() || update) install(game, action); else launch(game); }); bottom.add(action, BorderLayout.EAST); card.add(bottom, BorderLayout.SOUTH); return card;
    }

    private void install(Game game, JButton button) {
        button.setEnabled(false); new SwingWorker<Void, Integer>() {
            protected Void doInBackground() throws Exception { publish(0); Path temp = Files.createTempFile("gs-" + game.id, game.type.equals("zip") ? ".zip" : ".exe"); HttpRequest req = HttpRequest.newBuilder(URI.create(game.url)).GET().build(); http.send(req, HttpResponse.BodyHandlers.ofFile(temp)); publish(75); if (game.type.equals("zip")) { Path dir = GAMES_DIR.resolve(game.id); delete(dir); Files.createDirectories(dir); unzip(temp, dir); installed.setProperty(game.id + ".version", game.version); installed.setProperty(game.id + ".exe", game.executable); try (OutputStream out = Files.newOutputStream(STATE_FILE)) { installed.store(out, "Games Studio Launcher"); } } else open(temp); Files.deleteIfExists(temp); publish(100); return null; }
            protected void process(List<Integer> p) { button.setText("ЗАГРУЗКА " + p.get(p.size()-1) + "%"); }
            protected void done() { button.setEnabled(true); try { get(); status.setText(game.type.equals("zip") ? game.title + " готова к запуску" : "Установщик " + game.title + " открыт"); renderGames(); } catch (Exception e) { status.setText("Ошибка установки: " + e.getMessage()); button.setText("ПОВТОРИТЬ"); } }
        }.execute();
    }
    private void launch(Game game) { Path exe = GAMES_DIR.resolve(game.id).resolve(installed.getProperty(game.id + ".exe", game.executable)); if (!Files.exists(exe)) { status.setText("Не найден файл игры. Установите её снова."); return; } try { new ProcessBuilder(exe.toString()).directory(exe.getParent().toFile()).start(); } catch (IOException e) { status.setText("Не удалось запустить игру."); } }
    private void askLauncherUpdate() { if (JOptionPane.showConfirmDialog(null, "Доступен лаунчер " + manifest.launcherVersion + ". Скачать установщик?", "Обновление", JOptionPane.YES_NO_OPTION) == JOptionPane.YES_OPTION) openUrl(manifest.launcherUrl); }
    private static void unzip(Path zip, Path target) throws IOException { try (ZipInputStream in = new ZipInputStream(Files.newInputStream(zip))) { for (java.util.zip.ZipEntry e; (e = in.getNextEntry()) != null;) { Path out = target.resolve(e.getName()).normalize(); if (!out.startsWith(target)) throw new IOException("Некорректный путь в архиве"); if (e.isDirectory()) Files.createDirectories(out); else { Files.createDirectories(out.getParent()); Files.copy(in, out, StandardCopyOption.REPLACE_EXISTING); } } } }
    private static void delete(Path p) throws IOException { if (Files.exists(p)) try (var s = Files.walk(p)) { s.sorted(Comparator.reverseOrder()).forEach(x -> { try { Files.delete(x); } catch (IOException e) { throw new UncheckedIOException(e); } }); } }
    private static boolean isNewer(String remote, String local) { String[] a=remote.split("\\."), b=local.split("\\."); for(int i=0;i<Math.max(a.length,b.length);i++){ int x=i<a.length?Integer.parseInt(a[i]):0,y=i<b.length?Integer.parseInt(b[i]):0; if(x!=y)return x>y;} return false; }
    private static void open(Path p) { try { Desktop.getDesktop().open(p.toFile()); } catch (IOException ignored) { } }
    private static void openUrl(String s) { try { Desktop.getDesktop().browse(URI.create(s)); } catch (Exception ignored) { } }

    private record Game(String id, String title, String description, String version, String type, String url, String executable) {}
    private record Manifest(String launcherVersion, String launcherUrl, List<Game> games) {
        static Manifest read(HttpClient client, String url) throws Exception { String json = client.send(HttpRequest.newBuilder(URI.create(url)).GET().build(), HttpResponse.BodyHandlers.ofString()).body(); String l = value(json, "launcher", "version"), u=value(json,"launcher","installerUrl"); List<Game> games=new ArrayList<>(); Matcher m=Pattern.compile("\\{\\s*\\\"id\\"+"[\\s\\S]*?\\}").matcher(json); while(m.find()){String o=m.group(); games.add(new Game(v(o,"id"),v(o,"title"),v(o,"description"),v(o,"version"),v(o,"packageType"),v(o,"downloadUrl"),v(o,"executable")));} return new Manifest(l,u,games); }
        static String value(String json,String section,String key){ Matcher m=Pattern.compile("\\\""+section+"\\\"\\s*:\\s*\\{([\\s\\S]*?)\\}").matcher(json); return m.find()?v(m.group(1),key):""; }
        static String v(String text,String key){ Matcher m=Pattern.compile("\\\""+key+"\\\"\\s*:\\s*\\\"([^\\\"]*)\\\"").matcher(text); return m.find()?m.group(1):""; }
    }
}
